/**
 * BLE Manager Service
 * Handles Bluetooth Low Energy connection and communication with the Ring
 */

import {
  GATT_SERVICE_UUID,
  GATT_TX_CHARACTERISTIC_UUID,
  GATT_RX_CHARACTERISTIC_UUID,
  GATT_CCCD_UUID,
  ConnectionState,
  DeviceInfo,
  Opcode,
  BLEDevice,
} from '../types/ble';
import { buildFrame, extractOpcode, validateCRC8 } from '../utils/crc';
import { multiPacketHandler } from './MultiPacketHandler';
import { logger } from '../utils/Logger';
import { requestBLEPermissions, checkBLEPermissions } from '../utils/Permissions';
import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Top-level import - no conditional patterns
// react-native-ble-manager exports a singleton instance, not a class
import BleManager from 'react-native-ble-manager';

// Validate native module is present at module load time
const BleManagerNative = NativeModules.BleManager;
const isNativeModuleAvailable = BleManagerNative !== null && BleManagerNative !== undefined;

// CRITICAL: Log module status for runtime validation
if (Platform.OS === 'android') {
  if (isNativeModuleAvailable) {
    console.log('✅ NativeModules.BleManager: PRESENT');
    console.log('✅ Native module is loaded at runtime');
    console.log('✅ App is running as native Android build (not Expo Go)');
    logger.log('✅ NativeModules.BleManager: PRESENT - Native module loaded successfully');
  } else {
    console.error('❌ NativeModules.BleManager: MISSING');
    console.error('❌ Native module NOT found in NativeModules');
    logger.error('❌ CRITICAL: BleManager native module not found in NativeModules');
    logger.error('This means the APK was built without the native module.');
    logger.error('Required actions:');
    logger.error('1. Uninstall app from device');
    logger.error('2. Run: npx expo prebuild --clean');
    logger.error('3. Run: npx expo run:android');
    logger.error('4. DO NOT use Expo Go - use dev client or production build');
  }
}

class BLEManagerService {
  private connectionState: ConnectionState;
  private connectedDeviceId: string | null = null;
  private rxCharacteristic: string | null = null;
  private txCharacteristic: string | null = null;
  private serviceUUID: string | null = null;
  private listeners: Map<string, (data: number[]) => void> = new Map();
  private pendingRequests: Map<number, {
    resolve: (data: number[]) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  private isAvailable: boolean = false;
  private bluetoothState: string = 'unknown'; // 'unknown' | 'resetting' | 'unsupported' | 'unauthorized' | 'poweredOff' | 'poweredOn'
  private lastConnectedDeviceId: string | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 2; // Allow 1 silent failure, then retry
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isReconnecting: boolean = false;
  private readonly STORAGE_KEY_LAST_DEVICE = '@VitalLoop:lastConnectedDeviceId';

  constructor() {
    this.connectionState = {
      isScanning: false,
      isConnecting: false,
      isConnected: false,
    };
    
    // Validate native module is present before attempting to use it
    if (!isNativeModuleAvailable) {
      const errorMsg = 'BLE native module not available. The app was built without native BLE support. Please rebuild using "expo-dev-client" or ensure react-native-ble-manager is properly linked in your build configuration.';
      logger.error(errorMsg);
      logger.error('NativeModules.BleManager:', BleManagerNative);
      this.isAvailable = false;
      return;
    }
    
    // BleManager is a singleton instance, not a class - use it directly
    if (!BleManager || typeof BleManager !== 'object') {
      logger.error('BleManager module structure unexpected - native module may not be properly linked');
      this.isAvailable = false;
      return;
    }
    
    this.isAvailable = true;
    this.setupListeners();
    logger.log('✅ BLE Manager initialized - native module verified');
  }

  private setupListeners() {
    if (!this.isAvailable || !BleManager) {
      return;
    }

    try {
      // BLE State changes - CRITICAL: Track state for gating operations
      BleManager.addListener('BleManagerDidUpdateState', (args: { state: string }) => {
        const previousState = this.bluetoothState;
        this.bluetoothState = args.state;
        logger.log(`BLE State changed: ${previousState} → ${args.state}`);
        
        // If Bluetooth was off and is now on, log success
        if (previousState === 'poweredOff' && args.state === 'poweredOn') {
          logger.log('✅ Bluetooth enabled - scan/connect operations now available');
        }
        
        // If Bluetooth turned off, clear connection state
        if (args.state === 'poweredOff') {
          logger.warn('⚠️ Bluetooth turned OFF - scan/connect operations blocked');
          if (this.connectionState.isConnected) {
            logger.warn('Connection will be lost when Bluetooth is off');
          }
        }
      });

      // Characteristic notifications
      BleManager.addListener(
        'BleManagerDidUpdateValueForCharacteristic',
        (data: { value: number[]; characteristic: string; peripheral: string }) => {
          this.handleNotification(data.value, data.characteristic);
        }
      );

      // Connection events
      BleManager.addListener('BleManagerConnectPeripheral', (data: { peripheral: string }) => {
        logger.log('✅ Connected to device:', data.peripheral);
        this.connectionState.isConnecting = false;
        this.connectionState.isConnected = true;
        this.connectedDeviceId = data.peripheral;
        
        // CRITICAL: Save device ID for reconnection
        this.saveLastDeviceId(data.peripheral);
        
        // Reset reconnect attempts on successful connection
        this.reconnectAttempts = 0;
        this.isReconnecting = false;
        
        // Clear any pending reconnect timeout
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
        
        this.discoverServices(data.peripheral);
      });

      BleManager.addListener('BleManagerDisconnectPeripheral', (data: { peripheral: string }) => {
        logger.log('❌ Disconnected from device:', data.peripheral);
        this.connectionState.isConnected = false;
        
        // CRITICAL: Store device ID before clearing for reconnection
        const disconnectedDeviceId = this.connectedDeviceId || data.peripheral;
        this.connectedDeviceId = null;
        
        // Trigger auto-reconnect if this was an unexpected disconnect
        if (disconnectedDeviceId && !this.isReconnecting) {
          this.handleUnexpectedDisconnect(disconnectedDeviceId);
        }
      });
    } catch (error) {
      logger.error('Failed to setup BLE listeners:', error);
    }
  }

  /**
   * Check current Bluetooth state
   * Returns: 'unknown' | 'resetting' | 'unsupported' | 'unauthorized' | 'poweredOff' | 'poweredOn'
   */
  async checkBluetoothState(): Promise<string> {
    if (!this.isAvailable || !BleManager) {
      return 'unsupported';
    }

    try {
      // react-native-ble-manager uses checkState() method
      const state = await BleManager.checkState();
      this.bluetoothState = state;
      logger.log(`Bluetooth state checked: ${state}`);
      return state;
    } catch (error) {
      logger.error('Failed to check Bluetooth state:', error);
      return 'unknown';
    }
  }

  /**
   * Check if Bluetooth is powered on
   */
  private isBluetoothPoweredOn(): boolean {
    return this.bluetoothState === 'poweredOn';
  }

  /**
   * Load last connected device ID from storage
   */
  private async loadLastDeviceId(): Promise<string | null> {
    try {
      const deviceId = await AsyncStorage.getItem(this.STORAGE_KEY_LAST_DEVICE);
      if (deviceId) {
        this.lastConnectedDeviceId = deviceId;
        logger.log(`Loaded last connected device ID: ${deviceId}`);
      }
      return deviceId;
    } catch (error) {
      logger.error('Failed to load last device ID:', error);
      return null;
    }
  }

  /**
   * Save last connected device ID to storage
   */
  private async saveLastDeviceId(deviceId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY_LAST_DEVICE, deviceId);
      this.lastConnectedDeviceId = deviceId;
      logger.log(`Saved last connected device ID: ${deviceId}`);
    } catch (error) {
      logger.error('Failed to save last device ID:', error);
    }
  }

  /**
   * Clear last connected device ID from storage
   */
  private async clearLastDeviceId(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY_LAST_DEVICE);
      this.lastConnectedDeviceId = null;
      logger.log('Cleared last connected device ID');
    } catch (error) {
      logger.error('Failed to clear last device ID:', error);
    }
  }

  /**
   * Handle unexpected disconnect - attempt auto-reconnect
   */
  private async handleUnexpectedDisconnect(deviceId: string): Promise<void> {
    // Don't auto-reconnect if Bluetooth is off
    if (!this.isBluetoothPoweredOn()) {
      logger.warn('Bluetooth is off - skipping auto-reconnect');
      return;
    }

    // Don't auto-reconnect if already reconnecting
    if (this.isReconnecting) {
      logger.warn('Already reconnecting - skipping duplicate attempt');
      return;
    }

    // Reset reconnect attempts if we have a new device
    if (this.lastConnectedDeviceId !== deviceId) {
      this.reconnectAttempts = 0;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    logger.log(`Attempting auto-reconnect (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}) to device: ${deviceId}`);

    // Wait a bit before reconnecting (give system time to clean up)
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      await this.connect(deviceId);
      logger.log('✅ Auto-reconnect successful');
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
    } catch (error) {
      logger.warn(`Auto-reconnect attempt ${this.reconnectAttempts} failed:`, error);
      
      // If we haven't reached max attempts, retry
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        logger.log(`Will retry auto-reconnect (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
        // Retry after delay
        this.reconnectTimeout = setTimeout(() => {
          this.isReconnecting = false; // Reset flag to allow retry
          this.handleUnexpectedDisconnect(deviceId);
        }, 3000); // Wait 3 seconds before retry
      } else {
        logger.error(`Auto-reconnect failed after ${this.maxReconnectAttempts} attempts`);
        this.reconnectAttempts = 0;
        this.isReconnecting = false;
        this.connectionState.error = 'Connection lost. Tap "Reconnect" to try again.';
      }
    }
  }

  /**
   * Manual reconnect to last connected device
   */
  async reconnect(): Promise<void> {
    if (!this.lastConnectedDeviceId) {
      const storedId = await this.loadLastDeviceId();
      if (!storedId) {
        throw new Error('No previous device to reconnect to. Please scan and connect to a device first.');
      }
    }

    const deviceId = this.lastConnectedDeviceId;
    if (!deviceId) {
      throw new Error('No previous device to reconnect to. Please scan and connect to a device first.');
    }

    // Reset reconnect attempts for manual reconnect
    this.reconnectAttempts = 0;
    this.isReconnecting = false;

    logger.log(`Manual reconnect requested to device: ${deviceId}`);
    
    try {
      await this.connect(deviceId);
      logger.log('✅ Manual reconnect successful');
    } catch (error) {
      logger.error('Manual reconnect failed:', error);
      throw error;
    }
  }

  /**
   * Initialize BLE Manager
   */
  async initialize(): Promise<void> {
    // Double-check native module availability
    if (!isNativeModuleAvailable) {
      const errorMsg = 'BLE native module not available. The app was built without native BLE support. Please rebuild using "expo-dev-client" or ensure react-native-ble-manager is properly linked in your build configuration.';
      logger.error(errorMsg);
      logger.error('NativeModules check failed - module not in APK binary');
      throw new Error(errorMsg);
    }
    
    if (!this.isAvailable || !BleManager) {
      const errorMsg = 'BLE Manager not available. Native module may not be properly initialized.';
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      // Request BLE permissions first
      logger.log('Requesting BLE permissions...');
      const hasPermissions = await requestBLEPermissions();
      
      if (!hasPermissions) {
        const errorMsg = 'Bluetooth permissions are required to connect to your ring. Please grant permissions in Settings.';
        logger.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      logger.log('✅ BLE permissions granted');
      
      // CRITICAL CHECK: Can BleManager.start() execute without throwing?
      try {
        // Initialize BLE Manager (singleton instance)
        await BleManager.start({ showAlert: false });
        logger.log('✅ BLE Manager initialized - BleManager.start() executed successfully');
        console.log('✅ CRITICAL CHECK 4 PASSED: BleManager.start() executed without throwing');
      } catch (startError) {
        const errorMsg = `BleManager.start() failed: ${startError instanceof Error ? startError.message : String(startError)}`;
        logger.error('❌ CRITICAL: BleManager.start() threw an error');
        logger.error(errorMsg);
        console.error('❌ CRITICAL CHECK 4 FAILED: BleManager.start() threw an error');
        console.error('→ This indicates native module is present but not properly initialized');
        throw new Error(errorMsg);
      }
      
      // CRITICAL: Check Bluetooth state on startup
      logger.log('Checking Bluetooth state...');
      const state = await this.checkBluetoothState();
      
      if (!this.isBluetoothPoweredOn()) {
        const errorMsg = `Bluetooth is ${state}. Please enable Bluetooth to scan and connect to your ring.`;
        logger.error(`❌ ${errorMsg}`);
        this.connectionState.error = errorMsg;
        throw new Error(errorMsg);
      }
      
      logger.log('✅ Bluetooth is powered ON - ready for scan/connect operations');
      
      // Load last connected device ID from storage
      await this.loadLastDeviceId();
      
      // Optional: Auto-reconnect on startup if device was previously connected
      // This can be enabled if desired, but not required for D3 acceptance
      // if (this.lastConnectedDeviceId && this.isBluetoothPoweredOn()) {
      //   logger.log('Attempting auto-reconnect on startup...');
      //   setTimeout(() => {
      //     this.handleUnexpectedDisconnect(this.lastConnectedDeviceId!);
      //   }, 1000);
      // }
    } catch (error) {
      logger.error('Failed to initialize BLE:', error);
      // Don't throw - allow app to continue without BLE
      // The app can still function, just without BLE features
      logger.warn('App will continue without BLE support');
      // Set connection state to indicate BLE is not available
      this.connectionState.isConnected = false;
      throw error; // Re-throw to let caller handle
    }
  }

  /**
   * Scan for Ring devices
   * @param duration - Scan duration in milliseconds (default: 5000)
   */
  async scanForDevices(duration: number = 5000): Promise<BLEDevice[]> {
    if (!this.isAvailable || !BleManager) {
      logger.warn('BLE Manager not available for scanning');
      return [];
    }

    // CRITICAL: Check Bluetooth state before scanning
    if (!this.isBluetoothPoweredOn()) {
      const currentState = this.bluetoothState;
      const errorMsg = `Cannot scan: Bluetooth is ${currentState}. Please enable Bluetooth to scan for devices.`;
      logger.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }

    // Check permissions before scanning
    const hasPermissions = await checkBLEPermissions();
    if (!hasPermissions) {
      logger.error('BLE permissions not granted. Cannot scan.');
      throw new Error('Bluetooth permissions are required. Please grant permissions in Settings.');
    }

    if (this.connectionState.isScanning) {
      return [];
    }

    this.connectionState.isScanning = true;
    const foundDevices: BLEDevice[] = [];

    try {
      // Start scan
      await BleManager.scan([], duration, true);

      // Listen for discovered devices
      const scanListener = BleManager.addListener(
        'BleManagerDiscoverPeripheral',
        (device: BLEDevice) => {
          // Filter for Ring devices (check name or service UUID)
          if (
            device.name?.includes('Ring') ||
            device.name?.includes('R01') ||
            device.name?.includes('R02') ||
            device.name?.includes('R03') ||
            device.advertising?.serviceUUIDs?.includes(GATT_SERVICE_UUID)
          ) {
            foundDevices.push(device);
          }
        }
      );

      // Wait for scan to complete
      await new Promise(resolve => setTimeout(resolve, duration));

      scanListener.remove();
    } catch (error) {
      logger.error('Scan error:', error);
    } finally {
      this.connectionState.isScanning = false;
    }

    return foundDevices;
  }

  /**
   * Connect to a Ring device
   */
  async connect(deviceId: string): Promise<void> {
    if (!this.isAvailable || !BleManager) {
      throw new Error('BLE Manager not available - native module not linked');
    }

    // CRITICAL: Check Bluetooth state before connecting
    if (!this.isBluetoothPoweredOn()) {
      const currentState = this.bluetoothState;
      const errorMsg = `Cannot connect: Bluetooth is ${currentState}. Please enable Bluetooth to connect to your ring.`;
      logger.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }

    if (this.connectionState.isConnecting || this.connectionState.isConnected) {
      throw new Error('Already connecting or connected');
    }

    this.connectionState.isConnecting = true;
    this.connectionState.error = undefined;

    try {
      await BleManager.connect(deviceId);
      // Connection will be confirmed via listener
    } catch (error) {
      this.connectionState.isConnecting = false;
      this.connectionState.error = (error as Error).message;
      throw error;
    }
  }

  /**
   * Discover services and characteristics
   */
  private async discoverServices(deviceId: string): Promise<void> {
    try {
      const services = await BleManager.retrieveServices(deviceId);
      
      // Find main service
      const mainService = services.find((s: any) => s.uuid.toLowerCase() === GATT_SERVICE_UUID.toLowerCase());
      
      if (!mainService) {
        throw new Error('Main service not found');
      }

      this.serviceUUID = mainService.uuid;

      // Find TX and RX characteristics
      const txChar = mainService.characteristics?.find(
        (c: any) => c.uuid.toLowerCase().includes('fd03') || c.uuid.toLowerCase() === GATT_TX_CHARACTERISTIC_UUID.toLowerCase()
      );
      
      const rxChar = mainService.characteristics?.find(
        (c: any) => c.uuid.toLowerCase().includes('fd04') || c.uuid.toLowerCase() === GATT_RX_CHARACTERISTIC_UUID.toLowerCase()
      );

      if (!txChar || !rxChar) {
        throw new Error('TX or RX characteristic not found');
      }

      this.txCharacteristic = txChar.uuid;
      this.rxCharacteristic = rxChar.uuid;

      // Enable notifications on RX characteristic
      await this.enableNotifications(deviceId, rxChar.uuid);

      logger.log('✅ Services discovered and notifications enabled');
      logger.debug(`TX: ${this.txCharacteristic}, RX: ${this.rxCharacteristic}`);
    } catch (error) {
      logger.error('Service discovery error:', error);
      this.connectionState.error = (error as Error).message;
    }
  }

  /**
   * Enable notifications on RX characteristic
   */
  private async enableNotifications(deviceId: string, characteristicUUID: string): Promise<void> {
    try {
      await BleManager.startNotification(deviceId, this.serviceUUID!, characteristicUUID);
      logger.log('✅ Notifications enabled');
    } catch (error) {
      logger.error('Failed to enable notifications:', error);
      throw error;
    }
  }

  /**
   * Handle incoming notifications
   */
  private handleNotification(data: number[], characteristicUUID: string): void {
    // Validate frame length
    if (data.length !== 16) {
      logger.warn(`Invalid frame length: ${data.length}, expected 16`);
      return;
    }

    logger.logFrame('RX', data);

    if (!validateCRC8(data)) {
      logger.warn('Invalid CRC8 in received frame - rejecting');
      return;
    }

    const opcode = extractOpcode(data);
    logger.debug(`Received frame with opcode: 0x${opcode.toString(16)}`);

    // Handle multi-packet responses
    const hasMorePackets = multiPacketHandler.processPacket(opcode, data);
    
    if (hasMorePackets) {
      logger.debug(`Multi-packet response: more packets expected for opcode 0x${opcode.toString(16)}`);
      // More packets coming, don't resolve yet
      return;
    }

    // Check if this is a response to a pending request
    const pendingRequest = this.pendingRequests.get(opcode);
    if (pendingRequest) {
      // Check if multi-packet is complete (for multi-packet responses)
      const completeData = multiPacketHandler.getCompleteData(opcode);
      if (completeData || !hasMorePackets) {
        // Multi-packet complete or single-packet response, resolve
        logger.debug(`Response complete for opcode 0x${opcode.toString(16)}`);
        clearTimeout(pendingRequest.timeout);
        this.pendingRequests.delete(opcode);
        pendingRequest.resolve(data);
        return;
      }
    }

    // Check for notification listeners (for single-packet notifications)
    const listener = this.listeners.get(`notify_${opcode}`);
    if (listener) {
      logger.debug(`Dispatching notification for opcode 0x${opcode.toString(16)}`);
      listener(data);
    } else {
      logger.debug(`No listener registered for opcode 0x${opcode.toString(16)}`);
    }
  }

  /**
   * Send command to device
   */
  async sendCommand(opcode: Opcode, payload: number[] = []): Promise<number[]> {
    if (!this.isAvailable || !BleManager) {
      throw new Error('BLE Manager not available - native module not linked');
    }

    if (!this.connectionState.isConnected || !this.txCharacteristic || !this.serviceUUID) {
      throw new Error('Not connected to device');
    }

    // Clear any existing buffer for this opcode
    multiPacketHandler.clearBuffer(opcode);

    const frame = buildFrame(opcode, payload);
    logger.logFrame('TX', frame);
    logger.debug(`Sending command: opcode 0x${opcode.toString(16)}, payload length: ${payload.length}`);

    try {
      // Write to TX characteristic
      await BleManager.write(
        this.connectedDeviceId!,
        this.serviceUUID,
        this.txCharacteristic,
        frame
      );
      logger.debug(`Command sent successfully: opcode 0x${opcode.toString(16)}`);

      // Wait for response (with timeout)
      // For multi-packet responses, this will resolve when complete
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.pendingRequests.delete(opcode);
          multiPacketHandler.clearBuffer(opcode);
          reject(new Error(`Command timeout: opcode 0x${opcode.toString(16)}`));
        }, 10000); // Increased timeout for multi-packet responses

        this.pendingRequests.set(opcode, {
          resolve: (data: number[]) => {
            // Check if multi-packet is complete
            const completeData = multiPacketHandler.getCompleteData(opcode);
            if (completeData) {
              resolve(data); // Return last packet, parser will use multiPacketHandler
            } else {
              resolve(data); // Single packet response
            }
          },
          reject,
          timeout,
        });
      });
    } catch (error) {
      this.pendingRequests.delete(opcode);
      multiPacketHandler.clearBuffer(opcode);
      throw error;
    }
  }

  /**
   * Register listener for notifications
   */
  onNotification(opcode: number, callback: (data: number[]) => void): () => void {
    const key = `notify_${opcode}`;
    this.listeners.set(key, callback);

    return () => {
      this.listeners.delete(key);
    };
  }

  /**
   * Disconnect from device
   * @param clearStoredDevice - If true, clears stored device ID (for manual disconnect)
   */
  async disconnect(clearStoredDevice: boolean = false): Promise<void> {
    if (!this.isAvailable || !BleManager) {
      return;
    }

    // Clear any pending reconnect attempts
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.isReconnecting = false;
    this.reconnectAttempts = 0;

    if (this.connectedDeviceId) {
      try {
        await BleManager.disconnect(this.connectedDeviceId);
      } catch (error) {
        console.error('Disconnect error:', error);
      }
    }
    this.connectionState.isConnected = false;
    this.connectedDeviceId = null;

    // If manual disconnect, clear stored device ID
    if (clearStoredDevice) {
      await this.clearLastDeviceId();
    }
  }

  /**
   * Get last connected device ID (for UI display)
   */
  getLastConnectedDeviceId(): string | null {
    return this.lastConnectedDeviceId;
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Get current Bluetooth state
   */
  getBluetoothState(): string {
    return this.bluetoothState;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.isAvailable && BleManager) {
      try {
        BleManager.destroy();
      } catch (error) {
        logger.error('Error destroying BLE Manager:', error);
      }
    }
    this.listeners.clear();
    this.pendingRequests.forEach(req => clearTimeout(req.timeout));
    this.pendingRequests.clear();
  }
}

// Singleton instance - created lazily on first access
let _bleManagerInstance: BLEManagerService | null = null;

function getBLEManager(): BLEManagerService {
  if (!_bleManagerInstance) {
    try {
      _bleManagerInstance = new BLEManagerService();
    } catch (error) {
      console.error('Failed to create BLE Manager:', error);
      // Create a service instance anyway - it will handle unavailable BLE gracefully
      _bleManagerInstance = new BLEManagerService();
    }
  }
  return _bleManagerInstance;
}

// Export proxy object that lazily initializes
export const bleManager = {
  async initialize() {
    return getBLEManager().initialize();
  },
  
  async scanForDevices(duration?: number) {
    return getBLEManager().scanForDevices(duration);
  },
  
  async connect(deviceId: string) {
    return getBLEManager().connect(deviceId);
  },
  
  async disconnect(clearStoredDevice?: boolean) {
    if (_bleManagerInstance) {
      await _bleManagerInstance.disconnect(clearStoredDevice);
    }
  },
  
  async reconnect() {
    return getBLEManager().reconnect();
  },
  
  getLastConnectedDeviceId() {
    if (!_bleManagerInstance) {
      return null;
    }
    return _bleManagerInstance.getLastConnectedDeviceId();
  },
  
  async sendCommand(opcode: Opcode, payload?: number[]) {
    return getBLEManager().sendCommand(opcode, payload);
  },
  
  onNotification(opcode: number, callback: (data: number[]) => void) {
    return getBLEManager().onNotification(opcode, callback);
  },
  
  getConnectionState() {
    if (!_bleManagerInstance) {
      return {
        isScanning: false,
        isConnecting: false,
        isConnected: false,
      };
    }
    return _bleManagerInstance.getConnectionState();
  },
  
  async checkBluetoothState() {
    return getBLEManager().checkBluetoothState();
  },
  
  getBluetoothState() {
    if (!_bleManagerInstance) {
      return 'unknown';
    }
    return _bleManagerInstance.getBluetoothState();
  },
  
  destroy() {
    if (_bleManagerInstance) {
      _bleManagerInstance.destroy();
      _bleManagerInstance = null;
    }
  },
};
