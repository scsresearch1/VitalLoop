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
import { NativeModules, Platform, NativeEventEmitter } from 'react-native';
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
  private autoScanEnabled: boolean = false;
  private autoConnectEnabled: boolean = false;
  private autoScanInterval: NodeJS.Timeout | null = null;
  private scanListener: any = null;
  private connectionLock: boolean = false; // Prevent duplicate connect() calls
  private notificationsEnabled: boolean = false; // Track if notifications are enabled
  private connectionCallbacks: Array<(deviceId: string) => void> = []; // Callbacks for when connection is fully ready
  private bleEmitter: NativeEventEmitter | null = null; // Native event emitter for BLE events
  private eventSubscriptions: Array<{ remove: () => void }> = []; // Store all event subscriptions for cleanup
  private connectWatchdog: NodeJS.Timeout | null = null; // Watchdog timer to clear connection lock on timeout

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
    
    // Create NativeEventEmitter instance for reliable event subscription in Expo dev-client
    if (BleManagerNative) {
      this.bleEmitter = new NativeEventEmitter(BleManagerNative);
      logger.log('✅ NativeEventEmitter created for BLE events');
    } else {
      logger.error('❌ Cannot create NativeEventEmitter - BleManagerNative is null');
    }
    
    this.setupListeners();
    logger.log('✅ BLE Manager initialized - native module verified');
  }

  private setupListeners() {
    if (!this.isAvailable || !this.bleEmitter) {
      logger.warn('⚠️ Cannot setup listeners - BLE not available or emitter not created');
      return;
    }

    try {
      // BLE State changes - CRITICAL: Track state for gating operations
      const stateSubscription = this.bleEmitter.addListener('BleManagerDidUpdateState', (args: { state: string }) => {
        const previousState = this.bluetoothState;
        // Normalize state from listener (may be 'on' instead of 'poweredOn')
        const normalizedState = this.normalizeBluetoothState(args.state);
        this.bluetoothState = normalizedState;
        logger.log(`BLE State changed: ${previousState} → ${args.state} (normalized: ${normalizedState})`);
        
        // If Bluetooth was off and is now on, automatically start scanning
        if ((previousState === 'poweredOff' || previousState === 'off') && normalizedState === 'poweredOn') {
          logger.log('✅ Bluetooth enabled - scan/connect operations now available');
          // Auto-start scanning if enabled
          if (this.autoScanEnabled && !this.connectionState.isConnected) {
            logger.log('🔄 Auto-starting scan (Bluetooth just turned on)');
            this.startAutoScan();
          }
        }
        
        // If Bluetooth turned off, clear connection state
        if (normalizedState === 'poweredOff' || normalizedState === 'off') {
          logger.warn('⚠️ Bluetooth turned OFF - scan/connect operations blocked');
          if (this.connectionState.isConnected) {
            logger.warn('Connection will be lost when Bluetooth is off');
          }
          // Stop auto-scanning
          this.stopAutoScan();
        }
      });
      this.eventSubscriptions.push(stateSubscription);

      // Characteristic notifications
      const notificationSubscription = this.bleEmitter.addListener(
        'BleManagerDidUpdateValueForCharacteristic',
        (data: { value: number[]; characteristic: string; peripheral: string }) => {
          this.handleNotification(data.value, data.characteristic);
        }
      );
      this.eventSubscriptions.push(notificationSubscription);

      // Connection events
      const connectSubscription = this.bleEmitter.addListener('BleManagerConnectPeripheral', (data: { peripheral: string }) => {
        logger.log('✅ Connected to device:', data.peripheral);
        
        // CRITICAL: Clear watchdog timer on successful connection
        if (this.connectWatchdog) {
          clearTimeout(this.connectWatchdog);
          this.connectWatchdog = null;
          logger.log('✅ Connection watchdog cleared - connection confirmed');
        }
        
        this.connectionState.isConnecting = false;
        this.connectionState.isConnected = true;
        this.connectedDeviceId = data.peripheral;
        this.notificationsEnabled = false; // Reset notification state
        
        // CRITICAL: Save device ID for reconnection
        this.saveLastDeviceId(data.peripheral);
        
        // Stop auto-scanning once connected
        this.stopAutoScan();
        
        // Reset reconnect attempts on successful connection
        this.reconnectAttempts = 0;
        this.isReconnecting = false;
        
        // Clear any pending reconnect timeout
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
        
        // Discover services and enable notifications (async)
        this.discoverServices(data.peripheral).then(() => {
          // Notifications are now enabled, notify callbacks
          this.notificationsEnabled = true;
          logger.log('✅ Connection fully established - services discovered and notifications enabled');
          this.connectionCallbacks.forEach(callback => callback(data.peripheral));
          this.connectionCallbacks = []; // Clear callbacks after calling
        }).catch((error) => {
          logger.error('Failed to complete service discovery:', error);
          // Still notify callbacks but with error state
          this.connectionCallbacks.forEach(callback => callback(data.peripheral));
          this.connectionCallbacks = [];
        });
      });
      this.eventSubscriptions.push(connectSubscription);

      const disconnectSubscription = this.bleEmitter.addListener('BleManagerDisconnectPeripheral', (data: { peripheral: string }) => {
        logger.log('❌ Disconnected from device:', data.peripheral);
        
        // CRITICAL: Clear watchdog timer on disconnect
        if (this.connectWatchdog) {
          clearTimeout(this.connectWatchdog);
          this.connectWatchdog = null;
        }
        
        this.connectionState.isConnected = false;
        this.notificationsEnabled = false;
        this.connectionLock = false; // Release lock on disconnect
        this.connectionState.isConnecting = false; // Also clear isConnecting flag
        
        // CRITICAL: Store device ID before clearing for reconnection
        const disconnectedDeviceId = this.connectedDeviceId || data.peripheral;
        this.connectedDeviceId = null;
        
        // Clear connection callbacks
        this.connectionCallbacks = [];
        
        // Trigger auto-reconnect if this was an unexpected disconnect
        if (disconnectedDeviceId && !this.isReconnecting) {
          this.handleUnexpectedDisconnect(disconnectedDeviceId);
        }
      });
      this.eventSubscriptions.push(disconnectSubscription);
      
      logger.log(`✅ Setup ${this.eventSubscriptions.length} BLE event listeners via NativeEventEmitter`);
    } catch (error) {
      logger.error('Failed to setup BLE listeners:', error);
    }
  }

  /**
   * Check current Bluetooth state
   * Returns: 'unknown' | 'resetting' | 'unsupported' | 'unauthorized' | 'poweredOff' | 'poweredOn'
   * Note: react-native-ble-manager may return 'on' instead of 'poweredOn'
   */
  async checkBluetoothState(): Promise<string> {
    if (!this.isAvailable || !BleManager) {
      return 'unsupported';
    }

    try {
      // react-native-ble-manager uses checkState() method
      const state = await BleManager.checkState();
      // Normalize state: 'on' -> 'poweredOn', 'off' -> 'poweredOff'
      const normalizedState = this.normalizeBluetoothState(state);
      this.bluetoothState = normalizedState;
      logger.log(`Bluetooth state checked: ${state} (normalized: ${normalizedState})`);
      return normalizedState;
    } catch (error) {
      logger.error('Failed to check Bluetooth state:', error);
      return 'unknown';
    }
  }

  /**
   * Normalize Bluetooth state strings from different formats
   */
  private normalizeBluetoothState(state: string): string {
    const stateLower = state.toLowerCase();
    
    // Handle various state formats
    if (stateLower === 'on' || stateLower === 'poweredon' || stateLower === 'powered_on') {
      return 'poweredOn';
    }
    if (stateLower === 'off' || stateLower === 'poweredoff' || stateLower === 'powered_off') {
      return 'poweredOff';
    }
    if (stateLower === 'unauthorized' || stateLower === 'unauthorised') {
      return 'unauthorized';
    }
    
    // Return as-is if already normalized or unknown
    return state;
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
        // Provide clearer error message based on actual state
        let errorMsg: string;
        if (state === 'poweredOff' || state === 'off') {
          errorMsg = 'Bluetooth is turned off. Please enable Bluetooth in Settings to scan and connect to your ring.';
        } else if (state === 'unauthorized') {
          errorMsg = 'Bluetooth permission denied. Please grant Bluetooth permissions in Settings to use this feature.';
        } else if (state === 'unsupported') {
          errorMsg = 'Bluetooth is not supported on this device.';
        } else {
          errorMsg = `Bluetooth state is "${state}". Please ensure Bluetooth is enabled and permissions are granted.`;
        }
        logger.error(`❌ ${errorMsg}`);
        logger.error(`Current Bluetooth state: ${state}`);
        this.connectionState.error = errorMsg;
        throw new Error(errorMsg);
      }
      
      logger.log('✅ Bluetooth is powered ON - ready for scan/connect operations');
      
      // Load last connected device ID from storage
      await this.loadLastDeviceId();
      
      // Auto-start scanning and connecting if enabled
      if (this.autoScanEnabled) {
        logger.log('🔄 Auto-scan enabled - starting automatic scan for Ring device');
        // Check paired devices first, then scan
        this.startAutoScan();
      } else {
        // Even if auto-scan not enabled, check for already-paired Ring devices
        // This handles the case where device is connected at system level
        logger.log('Checking for already-paired Ring devices...');
        const pairedDevices = await this.getBondedPeripherals();
        if (pairedDevices.length > 0) {
          logger.log(`✅ Found ${pairedDevices.length} Ring device(s) already paired`);
          // Store the device ID for potential connection
          if (pairedDevices[0].id) {
            this.lastConnectedDeviceId = pairedDevices[0].id;
            await this.saveLastDeviceId(pairedDevices[0].id);
            logger.log(`Stored paired Ring device ID: ${pairedDevices[0].id}`);
          }
        }
      }
      
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
   * Get already-paired/connected devices
   * Useful when device is already connected at system level
   */
  async getBondedPeripherals(): Promise<BLEDevice[]> {
    if (!this.isAvailable || !BleManager) {
      return [];
    }

    try {
      const bondedDevices = await BleManager.getBondedPeripherals();
      logger.log(`Found ${bondedDevices.length} bonded/paired devices`);
      
      // Log all devices for debugging
      bondedDevices.forEach((device: BLEDevice) => {
        logger.log(`  - ${device.name || 'Unknown'} (${device.id})`);
      });
      
      // Filter for Ring devices - expanded pattern matching
      const ringDevices = bondedDevices.filter((device: BLEDevice) => {
        const deviceName = (device.name || '').toLowerCase();
        const deviceId = (device.id || '').toLowerCase();
        
        // Match various Ring naming patterns
        const isRingDevice = 
          deviceName.includes('ring') ||
          /^r\d{2}/i.test(device.name || '') || // R01, R02, R03, R11, etc.
          /^r\d{2}c/i.test(device.name || '') || // R11C_B803 pattern
          deviceName.includes('r01') ||
          deviceName.includes('r02') ||
          deviceName.includes('r03') ||
          deviceName.includes('r11') ||
          deviceId.includes('r11') ||
          device.advertising?.serviceUUIDs?.includes(GATT_SERVICE_UUID);
        
        if (isRingDevice) {
          logger.log(`✅ Ring device identified: ${device.name || device.id}`);
        }
        
        return isRingDevice;
      });
      
      if (ringDevices.length > 0) {
        logger.log(`✅ Found ${ringDevices.length} Ring device(s) in paired devices:`, ringDevices.map(d => `${d.name || 'Unknown'} (${d.id})`));
      } else {
        logger.log('⚠️ No Ring devices found in paired devices');
      }
      
      return ringDevices;
    } catch (error) {
      logger.error('Failed to get bonded peripherals:', error);
      return [];
    }
  }

  /**
   * Scan for Ring devices
   * @param duration - Scan duration in milliseconds (default: 5000)
   * @param includePairedDevices - Whether to include already-paired devices (default: true)
   * @param stopAutoScan - Whether to stop auto-scan during manual scan (default: true)
   */
  async scanForDevices(duration: number = 5000, includePairedDevices: boolean = true, stopAutoScan: boolean = true): Promise<BLEDevice[]> {
    if (!this.isAvailable || !BleManager) {
      logger.warn('BLE Manager not available for scanning');
      return [];
    }

    // CRITICAL: Check Bluetooth state before scanning
    // If state is 'unknown', query native state first
    if (this.bluetoothState === 'unknown') {
      logger.log('Bluetooth state unknown - querying native state...');
      await this.checkBluetoothState();
    }
    
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

    // If already scanning and this is a manual scan, stop auto-scan first
    if (stopAutoScan && this.connectionState.isScanning && this.autoScanEnabled) {
      logger.log('⏸️ Stopping auto-scan for manual scan');
      this.stopAutoScan();
      // Wait a bit for auto-scan to fully stop
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // If still scanning, wait for it to finish or return early
    if (this.connectionState.isScanning) {
      logger.warn('⚠️ Scan already in progress, waiting...');
      // Wait up to 2 seconds for current scan to finish
      let waitCount = 0;
      while (this.connectionState.isScanning && waitCount < 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
      }
      if (this.connectionState.isScanning) {
        logger.warn('⚠️ Previous scan still in progress, returning empty results');
        return [];
      }
    }

    this.connectionState.isScanning = true;
    const foundDevices: BLEDevice[] = [];

    try {
      // CRITICAL: Check already-paired devices first (like auto-scan does)
      // This is essential - device "R11C_B803" might already be paired
      if (includePairedDevices) {
        logger.log('🔍 Checking already-paired devices first...');
        const pairedDevices = await this.getBondedPeripherals();
        if (pairedDevices.length > 0) {
          logger.log(`✅ Found ${pairedDevices.length} Ring device(s) in paired devices`);
          foundDevices.push(...pairedDevices);
          // Don't auto-connect during manual scan - let user choose
        }
      }

      // Start BLE scan for new devices
      logger.log(`🔍 Starting BLE scan for ${duration}ms...`);
      await BleManager.scan([], duration, true);

      // Listen for discovered devices using NativeEventEmitter for reliability
      if (!this.bleEmitter) {
        throw new Error('BLE emitter not available - cannot listen for discovered devices');
      }
      
      const scanListener = this.bleEmitter.addListener(
        'BleManagerDiscoverPeripheral',
        (deviceData: any) => {
          try {
            // Handle case where device might come as array or object
            let device: BLEDevice;
            if (Array.isArray(deviceData)) {
              // If array, try to extract device info
              logger.warn('Device data received as array, attempting to parse...');
              device = {
                id: deviceData[0] || '',
                name: deviceData[1] || undefined,
                rssi: deviceData[2] || undefined,
              };
            } else if (deviceData && typeof deviceData === 'object') {
              // Normalize device object
              device = {
                id: deviceData.id || deviceData.peripheral || deviceData.address || '',
                name: deviceData.name || deviceData.localName || undefined,
                rssi: deviceData.rssi || undefined,
                advertising: deviceData.advertising || deviceData.advertisementData || undefined,
              };
            } else {
              logger.error('Invalid device data format received:', typeof deviceData);
              return;
            }

            if (!device.id) {
              logger.warn('Device discovered but missing ID, skipping');
              return;
            }

            // Filter for Ring devices (check name patterns or service UUID)
            // Support various Ring naming patterns: Ring, R01-R03, R11C_*, etc.
            const deviceName = device.name || '';
            const serviceUUIDs = device.advertising?.serviceUUIDs || [];
            const isRingDevice = 
              deviceName.toLowerCase().includes('ring') ||
              /^R\d{2}/i.test(deviceName) || // Matches R01, R02, R03, R11, etc.
              deviceName.includes('R01') ||
              deviceName.includes('R02') ||
              deviceName.includes('R03') ||
              deviceName.includes('R11') || // Matches R11C_B803 pattern
              (Array.isArray(serviceUUIDs) && serviceUUIDs.includes(GATT_SERVICE_UUID));

            if (isRingDevice) {
              // Check if device already in list (avoid duplicates)
              const alreadyFound = foundDevices.some(d => d.id === device.id);
              if (!alreadyFound) {
                foundDevices.push(device);
                logger.log(`🔔 Ring device discovered: ${device.name || device.id}`);
              }
              
              // Auto-connect ONLY if auto-connect is enabled AND this is NOT a manual scan
              // Manual scans should let user choose which device to connect to
              if (this.autoConnectEnabled && 
                  stopAutoScan === false && // Only auto-connect if this is an auto-scan
                  !this.connectionState.isConnected && 
                  !this.connectionState.isConnecting && 
                  device.id) {
                logger.log(`🔗 Auto-connecting to Ring device: ${device.name || device.id}`);
                // Stop auto-scanning once we're connecting
                this.stopAutoScan();
                this.connect(device.id).catch(error => {
                  logger.error('Auto-connect failed:', error);
                  // Resume auto-scan if connection failed
                  if (this.autoScanEnabled && !this.connectionState.isConnected) {
                    setTimeout(() => this.startAutoScan(), 3000);
                  }
                });
              }
            }
          } catch (error) {
            logger.error('Error processing discovered device:', error);
            // Continue scanning even if one device fails to process
          }
        }
      );
      
      // Store listener for cleanup
      this.scanListener = scanListener;

      // Wait for scan to complete
      await new Promise(resolve => setTimeout(resolve, duration));

      if (scanListener) {
        scanListener.remove();
        if (this.scanListener === scanListener) {
          this.scanListener = null;
        }
      }

      logger.log(`✅ Scan complete. Found ${foundDevices.length} Ring device(s)`);
    } catch (error) {
      logger.error('Scan error:', error);
      throw error; // Re-throw so UI can handle it
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
    // If state is 'unknown', query native state first
    if (this.bluetoothState === 'unknown') {
      logger.log('Bluetooth state unknown - querying native state...');
      await this.checkBluetoothState();
    }
    
    if (!this.isBluetoothPoweredOn()) {
      const currentState = this.bluetoothState;
      const errorMsg = `Cannot connect: Bluetooth is ${currentState}. Please enable Bluetooth to connect to your ring.`;
      logger.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }

    // Check if already connected to this device
    if (this.connectionState.isConnected && this.connectedDeviceId === deviceId) {
      logger.log('✅ Already connected to this device');
      return; // Already connected, no error
    }

    // CRITICAL: Check connection lock to prevent duplicate calls
    if (this.connectionLock) {
      logger.warn('⚠️ Connection lock is active - another connect() is in progress');
      if (this.connectionState.isConnecting && this.connectedDeviceId === deviceId) {
        logger.log('⏳ Already connecting to this device, please wait...');
        // Wait for connection to complete (max 5 seconds)
        return new Promise((resolve, reject) => {
          const checkInterval = setInterval(() => {
            if (this.connectionState.isConnected) {
              clearInterval(checkInterval);
              resolve();
            } else if (!this.connectionState.isConnecting) {
              clearInterval(checkInterval);
              // Clear lock if connection attempt completed without success
              this.connectionLock = false;
              reject(new Error('Connection attempt completed but not connected'));
            }
          }, 500);
          
          setTimeout(() => {
            clearInterval(checkInterval);
            // CRITICAL: Clear lock on timeout to prevent permanent deadlock
            this.connectionLock = false;
            this.connectionState.isConnecting = false;
            if (this.connectedDeviceId === deviceId) {
              this.connectedDeviceId = null;
            }
            logger.error('❌ Connection lock timeout - clearing lock to prevent deadlock');
            reject(new Error('Connection timeout - already connecting'));
          }, 5000);
        });
      } else {
        throw new Error('Connection already in progress to a different device');
      }
    }

    // Check if already connecting to this device (double-check)
    if (this.connectionState.isConnecting && this.connectedDeviceId === deviceId) {
      logger.log('⏳ Already connecting to this device, please wait...');
      // Wait for connection to complete (max 5 seconds)
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (this.connectionState.isConnected) {
            clearInterval(checkInterval);
            resolve();
          } else if (!this.connectionState.isConnecting) {
            clearInterval(checkInterval);
            // Clear lock if connection attempt completed without success
            this.connectionLock = false;
            reject(new Error('Connection attempt completed but not connected'));
          }
        }, 500);
        
        setTimeout(() => {
          clearInterval(checkInterval);
          // CRITICAL: Clear lock on timeout to prevent permanent deadlock
          this.connectionLock = false;
          this.connectionState.isConnecting = false;
          if (this.connectedDeviceId === deviceId) {
            this.connectedDeviceId = null;
          }
          logger.error('❌ Connection lock timeout - clearing lock to prevent deadlock');
          reject(new Error('Connection timeout - already connecting'));
        }, 5000);
      });
    }

    // If connecting to different device, disconnect first
    if (this.connectionState.isConnecting || this.connectionState.isConnected) {
      if (this.connectedDeviceId && this.connectedDeviceId !== deviceId) {
        logger.log('Disconnecting from previous device before connecting to new one...');
        try {
          await this.disconnect();
          // Wait a bit for disconnect to complete
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          logger.warn('Error disconnecting previous device:', error);
        }
      } else {
        // Same device, already connecting/connected
        logger.log('Already connecting or connected to this device');
        return;
      }
    }

    // CRITICAL: Stop any active scan before connecting
    if (this.connectionState.isScanning) {
      logger.log('⏸️ Stopping active scan before connecting...');
      try {
        await BleManager.stopScan();
        // Remove scan listener if exists
        if (this.scanListener) {
          this.scanListener.remove();
          this.scanListener = null;
        }
        this.connectionState.isScanning = false;
        // Wait a bit for scan to fully stop
        await new Promise(resolve => setTimeout(resolve, 300));
        logger.log('✅ Scan stopped');
      } catch (error) {
        logger.warn('Error stopping scan:', error);
        // Continue anyway - connection might still work
      }
    }

    // Also stop auto-scan if running
    if (this.autoScanEnabled) {
      this.stopAutoScan();
    }

    // Set connection lock to prevent duplicate calls
    this.connectionLock = true;
    this.connectionState.isConnecting = true;
    this.connectionState.error = undefined;
    this.connectedDeviceId = deviceId; // Set early to prevent duplicate attempts

    // CRITICAL: Set up watchdog timer to clear lock if connection confirmation doesn't arrive
    const CONNECT_TIMEOUT_MS = 12000; // 12 seconds
    this.connectWatchdog = setTimeout(() => {
      if (this.connectionLock && this.connectionState.isConnecting && this.connectedDeviceId === deviceId) {
        logger.error('❌ Connection watchdog timeout - no BleManagerConnectPeripheral event received');
        logger.error('→ Clearing connection lock to prevent permanent deadlock');
        
        // Clear all connection state
        this.connectionLock = false;
        this.connectionState.isConnecting = false;
        this.connectionState.error = 'Connect confirmation timeout - device did not respond';
        this.connectedDeviceId = null;
        
        // Best-effort disconnect attempt
        try {
          if (BleManager && deviceId) {
            BleManager.disconnect(deviceId).catch((err) => {
              logger.warn('Watchdog disconnect attempt failed:', err);
            });
          }
        } catch (err) {
          logger.warn('Watchdog disconnect attempt error:', err);
        }
      }
      this.connectWatchdog = null;
    }, CONNECT_TIMEOUT_MS);

    try {
      logger.log(`🔗 Connecting to device: ${deviceId}`);
      await BleManager.connect(deviceId);
      // Connection will be confirmed via listener (BleManagerConnectPeripheral)
      // Watchdog will clear lock if event doesn't arrive within timeout
      logger.log('Connection request sent, waiting for confirmation...');
      // Note: connectionLock will be released when connection completes (via listener) or fails (via watchdog)
    } catch (error) {
      // Clear watchdog on immediate error
      if (this.connectWatchdog) {
        clearTimeout(this.connectWatchdog);
        this.connectWatchdog = null;
      }
      
      // Release lock on error
      this.connectionLock = false;
      this.connectionState.isConnecting = false;
      this.connectedDeviceId = null;
      this.connectionState.error = (error as Error).message;
      logger.error('Connection failed:', error);
      throw error;
    }
  }

  /**
   * Discover services and characteristics
   * 
   * react-native-ble-manager v12.4.4 returns PeripheralInfo:
   * {
   *   id: string,
   *   services: Service[] (each with { uuid: string }),
   *   characteristics: Characteristic[] (each with { characteristic: string, service: string, properties: {...} })
   * }
   * 
   * Characteristics are NOT nested under services - they're at the same level,
   * and each characteristic has a 'service' field indicating which service it belongs to.
   */
  private async discoverServices(deviceId: string): Promise<void> {
    try {
      logger.log('🔍 Retrieving services...');
      const peripheralInfo = await BleManager.retrieveServices(deviceId);
      
      // Log the actual structure for debugging
      logger.debug('retrieveServices returned:', JSON.stringify(peripheralInfo, null, 2));
      
      // Handle the actual return format from react-native-ble-manager v12.4.4
      if (!peripheralInfo || typeof peripheralInfo !== 'object') {
        throw new Error('retrieveServices returned invalid data');
      }

      // Extract services array (PeripheralInfo.services is Service[])
      const servicesArray: Array<{ uuid: string }> = peripheralInfo.services || [];
      logger.log(`✅ Services retrieved successfully (found ${servicesArray.length} service(s))`);
      
      if (servicesArray.length === 0) {
        throw new Error('No services found on device');
      }

      // Find main service by UUID
      const mainService = servicesArray.find((s) => {
        const uuid = s?.uuid || '';
        return uuid.toLowerCase() === GATT_SERVICE_UUID.toLowerCase();
      });
      
      if (!mainService || !mainService.uuid) {
        logger.error('Available services:', servicesArray.map(s => s.uuid));
        throw new Error(`Main service ${GATT_SERVICE_UUID} not found`);
      }

      this.serviceUUID = mainService.uuid;
      logger.log(`✅ Found main service: ${this.serviceUUID}`);

      // Extract characteristics array (PeripheralInfo.characteristics is Characteristic[])
      // Characteristics are NOT nested - they're at the same level as services
      const allCharacteristics: Array<{
        characteristic: string;
        service: string;
        properties?: any;
      }> = peripheralInfo.characteristics || [];
      
      logger.log(`✅ Found ${allCharacteristics.length} total characteristic(s)`);

      // Filter characteristics that belong to our main service
      const serviceCharacteristics = allCharacteristics.filter((c) => {
        const charServiceUUID = c?.service || '';
        return charServiceUUID.toLowerCase() === this.serviceUUID.toLowerCase();
      });
      
      logger.log(`✅ Found ${serviceCharacteristics.length} characteristic(s) for main service`);

      // Find TX and RX characteristics by UUID
      const txChar = serviceCharacteristics.find((c) => {
        const uuid = c?.characteristic || '';
        return uuid.toLowerCase().includes('fd03') || 
               uuid.toLowerCase() === GATT_TX_CHARACTERISTIC_UUID.toLowerCase();
      });
      
      const rxChar = serviceCharacteristics.find((c) => {
        const uuid = c?.characteristic || '';
        return uuid.toLowerCase().includes('fd04') || 
               uuid.toLowerCase() === GATT_RX_CHARACTERISTIC_UUID.toLowerCase();
      });

      if (!txChar || !txChar.characteristic) {
        logger.error('Available characteristics for service:', 
          serviceCharacteristics.map(c => c.characteristic));
        throw new Error(`TX characteristic (${GATT_TX_CHARACTERISTIC_UUID}) not found`);
      }
      
      if (!rxChar || !rxChar.characteristic) {
        logger.error('Available characteristics for service:', 
          serviceCharacteristics.map(c => c.characteristic));
        throw new Error(`RX characteristic (${GATT_RX_CHARACTERISTIC_UUID}) not found`);
      }

      this.txCharacteristic = txChar.characteristic;
      this.rxCharacteristic = rxChar.characteristic;

      logger.log(`✅ TX characteristic: ${this.txCharacteristic}`);
      logger.log(`✅ RX characteristic: ${this.rxCharacteristic}`);

      // Enable notifications on RX characteristic
      await this.enableNotifications(deviceId, this.rxCharacteristic);

      logger.log('✅ Services discovered and notifications enabled');
      // Release connection lock now that everything is set up
      this.connectionLock = false;
    } catch (error) {
      this.connectionLock = false; // Release lock on error
      logger.error('Service discovery error:', error);
      logger.error('Error details:', error instanceof Error ? error.stack : String(error));
      this.connectionState.error = (error as Error).message;
      throw error; // Re-throw so caller knows it failed
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
   * Get currently connected device ID (if any)
   */
  getConnectedDeviceId(): string | null {
    return this.connectionState.isConnected ? this.connectedDeviceId : null;
  }

  /**
   * Wait for notifications to be enabled after connection
   * Returns a promise that resolves when notifications are enabled
   */
  async waitForNotifications(timeout: number = 10000): Promise<void> {
    if (this.notificationsEnabled) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (this.notificationsEnabled) {
          clearInterval(checkInterval);
          resolve();
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          reject(new Error('Timeout waiting for notifications to be enabled'));
        } else if (!this.connectionState.isConnected) {
          clearInterval(checkInterval);
          reject(new Error('Connection lost while waiting for notifications'));
        }
      }, 200);

      // Also register a callback in case notifications are enabled before next check
      this.connectionCallbacks.push(() => {
        clearInterval(checkInterval);
        if (this.notificationsEnabled) {
          resolve();
        } else {
          reject(new Error('Connection ready but notifications not enabled'));
        }
      });
    });
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Get current Bluetooth state (synchronous)
   * Returns cached state, which may be 'unknown' if not yet checked
   */
  getBluetoothState(): string {
    return this.bluetoothState;
  }

  /**
   * Get current Bluetooth state (async - always queries native)
   * Use this when you need to ensure state is current before blocking operations
   */
  async getBluetoothStateAsync(): Promise<string> {
    return await this.checkBluetoothState();
  }

  /**
   * Enable automatic scanning and connection
   * Automatically scans for Ring devices and connects when found
   */
  enableAutoScanAndConnect(): void {
    this.autoScanEnabled = true;
    this.autoConnectEnabled = true;
    logger.log('✅ Auto-scan and auto-connect enabled');
    
    // Start scanning if Bluetooth is on
    if (this.isBluetoothPoweredOn() && !this.connectionState.isConnected) {
      this.startAutoScan();
    }
  }

  /**
   * Disable automatic scanning
   */
  disableAutoScan(): void {
    this.autoScanEnabled = false;
    this.autoConnectEnabled = false;
    this.stopAutoScan();
    logger.log('⏸️ Auto-scan disabled');
  }

  /**
   * Start automatic scanning for Ring devices
   */
  private async startAutoScan(): Promise<void> {
    if (!this.autoScanEnabled || this.connectionState.isConnected || this.connectionState.isScanning) {
      return;
    }

    if (!this.isBluetoothPoweredOn()) {
      logger.warn('Cannot auto-scan: Bluetooth is not powered on');
      return;
    }

    try {
      logger.log('🔍 Starting automatic scan for Ring device...');
      
      // First, check already-paired devices (device might already be connected at system level)
      // This is CRITICAL - device "R11C_B803" is already connected at system level
      logger.log('🔍 Checking already-paired devices first...');
      const pairedDevices = await this.getBondedPeripherals();
      
      if (pairedDevices.length > 0) {
        logger.log(`✅ Found ${pairedDevices.length} Ring device(s) in paired devices - attempting auto-connect`);
        // Auto-connect to first paired Ring device
        const ringDevice = pairedDevices[0];
        if (ringDevice.id && this.autoConnectEnabled) {
          logger.log(`🔗 Auto-connecting to paired Ring device: ${ringDevice.name || ringDevice.id}`);
          this.stopAutoScan();
          
          // Try to connect to the already-paired device
          try {
            await this.connect(ringDevice.id);
            logger.log('✅ Successfully connected to paired Ring device');
            return; // Successfully connected, stop scanning
          } catch (error) {
            logger.error('Auto-connect to paired device failed:', error);
            logger.log('Will continue with BLE scan as fallback...');
            // If connection fails, continue with scan below
          }
        }
      } else {
        logger.log('⚠️ No Ring devices found in paired devices - will scan for new devices');
      }
      
      // If no paired device found or connection failed, scan for new devices
      // Auto-scan: don't stop itself, and allow auto-connect
      logger.log('No paired Ring device found, scanning for new devices...');
      await this.scanForDevices(10000, true, false); // includePairedDevices=true, stopAutoScan=false
      
      // If no device found, retry after delay
      if (!this.connectionState.isConnected) {
        logger.log('⏳ No Ring device found, will retry in 5 seconds...');
        this.autoScanInterval = setTimeout(() => {
          if (this.autoScanEnabled && !this.connectionState.isConnected) {
            this.startAutoScan();
          }
        }, 5000);
      }
    } catch (error) {
      logger.error('Auto-scan error:', error);
      // Retry after delay
      this.autoScanInterval = setTimeout(() => {
        if (this.autoScanEnabled && !this.connectionState.isConnected) {
          this.startAutoScan();
        }
      }, 5000);
    }
  }

  /**
   * Stop automatic scanning
   */
  private stopAutoScan(): void {
    if (this.autoScanInterval) {
      clearTimeout(this.autoScanInterval);
      this.autoScanInterval = null;
    }
    if (this.scanListener) {
      this.scanListener.remove();
      this.scanListener = null;
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    // Stop auto-scanning
    this.stopAutoScan();
    this.autoScanEnabled = false;
    this.autoConnectEnabled = false;
    
    // CRITICAL: Remove all event subscriptions
    this.eventSubscriptions.forEach(subscription => {
      try {
        subscription.remove();
      } catch (error) {
        logger.warn('Error removing event subscription:', error);
      }
    });
    this.eventSubscriptions = [];
    
    // Clear watchdog timer
    if (this.connectWatchdog) {
      clearTimeout(this.connectWatchdog);
      this.connectWatchdog = null;
    }
    
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
  
  async getBondedPeripherals() {
    return getBLEManager().getBondedPeripherals();
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

  getConnectedDeviceId() {
    if (!_bleManagerInstance) {
      return null;
    }
    return _bleManagerInstance.getConnectedDeviceId();
  },

  async waitForNotifications(timeout?: number) {
    if (!_bleManagerInstance) {
      return Promise.reject(new Error('BLE Manager not initialized'));
    }
    return _bleManagerInstance.waitForNotifications(timeout);
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
  
  async getBluetoothStateAsync() {
    if (!_bleManagerInstance) {
      return 'unknown';
    }
    return await _bleManagerInstance.getBluetoothStateAsync();
  },
  
  destroy() {
    if (_bleManagerInstance) {
      _bleManagerInstance.destroy();
      _bleManagerInstance = null;
    }
  },
  
  enableAutoScanAndConnect() {
    return getBLEManager().enableAutoScanAndConnect();
  },
  
  disableAutoScan() {
    return getBLEManager().disableAutoScan();
  },
};
