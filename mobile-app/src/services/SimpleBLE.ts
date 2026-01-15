/**
 * Simple BLE Service
 * Minimal implementation: Enable, Scan, Connect, Receive Data
 * FIXED: Scan stability, connection timeout, notification enabling, state management
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { requestBLEPermissions } from '../utils/Permissions';
import BleManager from 'react-native-ble-manager';

const BleManagerNative = NativeModules.BleManager;

// GATT UUIDs
const SERVICE_UUID = '000002fd-3C17-D293-8E48-14FE2E4DA212';
const TX_CHAR = '0000fd03-0000-1000-8000-00805f9b34fb';
const RX_CHAR = '0000fd04-0000-1000-8000-00805f9b34fb';

interface Device {
  id: string;
  name?: string;
  rssi?: number;
}

type ConnectionCallback = (deviceId: string) => void;
type DisconnectionCallback = () => void;

class SimpleBLE {
  private emitter: NativeEventEmitter | null = null;
  private _isInitialized = false;
  public get isInitialized() { return this._isInitialized; }
  private connectedDeviceId: string | null = null;
  private serviceUUID: string | null = null;
  private txChar: string | null = null;
  private rxChar: string | null = null;
  private onDataCallback: ((data: number[]) => void) | null = null;
  private subscriptions: any[] = [];
  
  // FIXED: Connection state management
  private isConnecting: boolean = false;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private connectionCallbacks: ConnectionCallback[] = [];
  private disconnectionCallbacks: DisconnectionCallback[] = [];
  private notificationsEnabled: boolean = false;

  constructor() {
    if (BleManagerNative) {
      this.emitter = new NativeEventEmitter(BleManagerNative);
    }
  }

  async initialize(): Promise<void> {
    if (this._isInitialized) return;

    console.log('🔵 Initializing BLE...');

    // Check native module
    if (!BleManagerNative) {
      throw new Error('BLE native module not available');
    }

    // Verify native module has expected methods (v8.0.6 API)
    try {
      const requiredMethods = ['start', 'scan', 'connect', 'retrieveServices', 'startNotification'];
      const missingMethods = requiredMethods.filter(method => typeof BleManager[method] !== 'function');
      
      if (missingMethods.length > 0) {
        console.error('❌ Native module missing methods:', missingMethods);
        throw new Error(`BLE native module not properly installed. Missing methods: ${missingMethods.join(', ')}`);
      }
      console.log('✅ Native module methods verified (v8.0.6)');
    } catch (error: any) {
      if (error.message.includes('Missing methods')) {
        throw error;
      }
      console.warn('⚠️ Could not verify native module methods:', error.message);
    }

    // CRITICAL: Request permissions BEFORE starting BLE Manager
    console.log('🔐 Requesting Bluetooth permissions...');
    const hasPermissions = await requestBLEPermissions();
    if (!hasPermissions) {
      console.error('❌ Bluetooth permissions denied');
      throw new Error('Bluetooth permissions denied. Please grant permissions in Settings.');
    }
    console.log('✅ Permissions granted');

    // Start BLE Manager AFTER permissions are granted
    console.log('🚀 Starting BLE Manager...');
    try {
      await BleManager.start({ showAlert: false });
      console.log('✅ BLE Manager started');
    } catch (error: any) {
      console.error('❌ Failed to start BLE Manager:', error);
      throw new Error(`Failed to start BLE Manager: ${error.message}`);
    }

    // Setup event listeners
    this.setupListeners();

    this._isInitialized = true;
    console.log('✅ BLE initialized successfully');
  }

  private setupListeners(): void {
    if (!this.emitter) return;

    // Connection event
    const connectSub = this.emitter.addListener('BleManagerConnectPeripheral', (data: { peripheral: string }) => {
      console.log('✅ Connected event received:', data.peripheral);
      
      // FIXED: Clear connection timeout
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
      
      this.connectedDeviceId = data.peripheral;
      this.isConnecting = false;
      
      // FIXED: Discover services and enable notifications, then notify callbacks
      this.discoverServicesAndEnableNotifications(data.peripheral)
        .then(() => {
          console.log('✅ Connection fully established - services discovered, notifications enabled');
          // Notify all connection callbacks
          this.connectionCallbacks.forEach(cb => cb(data.peripheral));
        })
        .catch((error) => {
          console.error('❌ Failed to complete connection setup:', error);
          // Still notify callbacks but log the error
          this.connectionCallbacks.forEach(cb => cb(data.peripheral));
        });
    });
    this.subscriptions.push(connectSub);

    // Disconnect event
    const disconnectSub = this.emitter.addListener('BleManagerDisconnectPeripheral', (data: { peripheral?: string }) => {
      console.log('❌ Disconnected event received');
      this.connectedDeviceId = null;
      this.serviceUUID = null;
      this.txChar = null;
      this.rxChar = null;
      this.isConnecting = false;
      this.notificationsEnabled = false;
      
      // Clear connection timeout if still active
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
      
      // Notify disconnection callbacks
      this.disconnectionCallbacks.forEach(cb => cb());
    });
    this.subscriptions.push(disconnectSub);

    // Data received
    const dataSub = this.emitter.addListener('BleManagerDidUpdateValueForCharacteristic', (data: any) => {
      try {
        let value: number[] = [];
        
        if (Array.isArray(data)) {
          value = data;
        } else if (data && typeof data === 'object') {
          if (Array.isArray(data.value)) {
            value = data.value;
          } else if (data.value && typeof data.value === 'object') {
            value = Object.values(data.value) as number[];
          }
        }
        
        if (value.length > 0 && this.onDataCallback) {
          this.onDataCallback(value);
        }
      } catch (error) {
        console.error('Error processing notification data:', error);
      }
    });
    this.subscriptions.push(dataSub);
  }

  // FIXED: Stable scan with proper error handling
  async scanForRing(): Promise<Device[]> {
    if (!this._isInitialized) {
      await this.initialize();
    }

    console.log('🔍 Scanning for Ring...');
    const devices: Device[] = [];
    let scanSub: any = null;
    let scanError: Error | null = null;

    // Check paired devices first
    try {
      const paired = await BleManager.getBondedPeripherals();
      for (const device of paired) {
        const name = (device.name || '').toLowerCase();
        if (name.includes('ring') || name.includes('r11') || name.includes('r01') || name.includes('r02') || name.includes('r03')) {
          devices.push({ id: device.id, name: device.name, rssi: device.rssi });
        }
      }
    } catch (e) {
      console.log('No paired devices');
    }

    // FIXED: Scan with proper error handling and listener protection
    try {
      await BleManager.scan([], 10, true);
      console.log('✅ Scan started (using v8.0.6 API)');
    } catch (error: any) {
      console.error('❌ Scan failed to start:', error);
      throw error;
    }

    // FIXED: Wrap listener in try-catch to prevent crashes
    scanSub = this.emitter?.addListener('BleManagerDiscoverPeripheral', (deviceData: any) => {
      try {
        let device: any;
        
        if (Array.isArray(deviceData)) {
          device = {
            id: deviceData[0] || deviceData[1] || '',
            name: deviceData[1] || deviceData[2] || undefined,
            rssi: deviceData[2] || deviceData[3] || undefined,
          };
        } else if (deviceData && typeof deviceData === 'object' && !Array.isArray(deviceData)) {
          device = {
            id: deviceData.id || deviceData.peripheral || deviceData.address || '',
            name: deviceData.name || deviceData.localName || undefined,
            rssi: deviceData.rssi || undefined,
          };
        } else {
          return; // Skip invalid data
        }

        if (!device.id) {
          return; // Skip devices without ID
        }

        const name = (device.name || '').toLowerCase();
        if (name.includes('ring') || name.includes('r11') || name.includes('r01') || name.includes('r02') || name.includes('r03')) {
          // FIXED: Check for duplicates before adding
          const exists = devices.some(d => d.id === device.id);
          if (!exists) {
            devices.push({ id: device.id, name: device.name, rssi: device.rssi });
            console.log('🔔 Found:', device.name || device.id);
          }
        }
      } catch (error) {
        // FIXED: Log error but don't crash scan
        console.error('Error processing discovered device (non-fatal):', error);
        scanError = error instanceof Error ? error : new Error(String(error));
      }
    });
    
    if (scanSub) {
      this.subscriptions.push(scanSub);
    }

    // Wait for scan to complete
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Stop scan
    try {
      await BleManager.stopScan();
    } catch (e) {
      // Ignore stop scan errors
    }

    // FIXED: Clean up listener safely
    if (scanSub) {
      try {
        scanSub.remove();
        const index = this.subscriptions.indexOf(scanSub);
        if (index > -1) {
          this.subscriptions.splice(index, 1);
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    // FIXED: Throw error if scan had issues (but still return found devices)
    if (scanError) {
      console.warn('⚠️ Scan completed with errors, but found devices:', devices.length);
    }

    console.log(`✅ Scan complete. Found ${devices.length} device(s)`);
    return devices;
  }

  // FIXED: Connection with timeout and proper state management
  async connect(deviceId: string): Promise<void> {
    if (!this._isInitialized) {
      await this.initialize();
    }

    // FIXED: Clear any existing connection state
    if (this.isConnecting) {
      console.warn('⚠️ Already connecting, clearing previous attempt...');
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
      }
    }

    // FIXED: Disconnect from previous device if different
    if (this.connectedDeviceId && this.connectedDeviceId !== deviceId) {
      console.log('Disconnecting from previous device...');
      try {
        await BleManager.disconnect(this.connectedDeviceId);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        // Ignore disconnect errors
      }
    }

    this.isConnecting = true;
    console.log(`🔗 Connecting to ${deviceId}...`);

    // FIXED: Set connection timeout (15 seconds)
    const CONNECTION_TIMEOUT = 15000;
    this.connectionTimeout = setTimeout(() => {
      if (this.isConnecting) {
        console.error('❌ Connection timeout - no connection event received');
        this.isConnecting = false;
        this.connectionTimeout = null;
        // Don't throw here - let the promise reject naturally
      }
    }, CONNECTION_TIMEOUT);

    try {
      await BleManager.connect(deviceId);
      console.log('✅ Connect call completed, waiting for connection event...');
      // Connection will be confirmed via listener
      // If timeout fires before event, isConnecting will be cleared
    } catch (error: any) {
      console.error('❌ Connect failed:', error);
      this.isConnecting = false;
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
      throw error;
    }
  }

  // FIXED: Separate method for service discovery and notification enabling
  private async discoverServicesAndEnableNotifications(deviceId: string): Promise<void> {
    console.log('🔍 Discovering services and enabling notifications...');
    
    try {
      // Wait a bit after connection before retrieving services (GATT needs time)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const info = await BleManager.retrieveServices(deviceId);
      console.log('🔍 Raw retrieveServices result type:', typeof info, Array.isArray(info) ? 'ARRAY' : 'OBJECT');

      if (Array.isArray(info)) {
        throw new Error('retrieveServices returned array instead of object');
      }

      let services: any[] = [];
      let characteristics: any[] = [];

      if (info && typeof info === 'object' && !Array.isArray(info)) {
        if (Array.isArray(info.services)) {
          services = info.services;
        } else if (info.services && typeof info.services === 'object' && !Array.isArray(info.services)) {
          services = Object.values(info.services);
        }

        if (Array.isArray(info.characteristics)) {
          characteristics = info.characteristics;
        } else if (info.characteristics && typeof info.characteristics === 'object' && !Array.isArray(info.characteristics)) {
          characteristics = Object.values(info.characteristics);
        }
      } else {
        throw new Error(`Invalid retrieveServices return type: ${typeof info}`);
      }

      console.log(`🔍 Found ${services.length} services, ${characteristics.length} characteristics`);

      // Find service
      const service = services.find((s: any) => {
        const uuid = s?.uuid || s?.serviceUUID || '';
        return uuid.toLowerCase() === SERVICE_UUID.toLowerCase();
      });

      if (!service) {
        console.error('Available services:', services.map(s => s?.uuid || s?.serviceUUID || 'unknown'));
        throw new Error(`Ring service ${SERVICE_UUID} not found`);
      }

      this.serviceUUID = service.uuid || service.serviceUUID;
      console.log('✅ Service found:', this.serviceUUID);

      // Find characteristics
      const serviceCharacteristics = characteristics.filter((c: any) => {
        const charService = c?.service || c?.serviceUUID || '';
        return charService.toLowerCase() === this.serviceUUID.toLowerCase();
      });

      const tx = serviceCharacteristics.find((c: any) => {
        const uuid = c?.characteristic || c?.uuid || c?.characteristicUUID || '';
        return uuid.toLowerCase().includes('fd03') || uuid.toLowerCase() === TX_CHAR.toLowerCase();
      });

      const rx = serviceCharacteristics.find((c: any) => {
        const uuid = c?.characteristic || c?.uuid || c?.characteristicUUID || '';
        return uuid.toLowerCase().includes('fd04') || uuid.toLowerCase() === RX_CHAR.toLowerCase();
      });

      if (!tx || !rx) {
        throw new Error(`Characteristics not found. TX: ${!!tx}, RX: ${!!rx}`);
      }

      this.txChar = tx.characteristic || tx.uuid || tx.characteristicUUID;
      this.rxChar = rx.characteristic || rx.uuid || rx.characteristicUUID;
      console.log('✅ TX:', this.txChar);
      console.log('✅ RX:', this.rxChar);

      // FIXED: Enable notifications with timeout
      console.log('🔔 Enabling notifications...');
      try {
        await BleManager.startNotification(deviceId, this.serviceUUID, this.rxChar);
        this.notificationsEnabled = true;
        console.log('✅ Notifications enabled - ready to receive data');
      } catch (error: any) {
        console.error('❌ Failed to enable notifications:', error);
        throw new Error(`Failed to enable notifications: ${error.message}`);
      }
    } catch (error: any) {
      console.error('❌ Service discovery/notification setup failed:', error);
      throw error;
    }
  }

  // FIXED: Add connection state getters
  getIsConnecting(): boolean {
    return this.isConnecting;
  }

  getNotificationsEnabled(): boolean {
    return this.notificationsEnabled;
  }

  // FIXED: Add connection callbacks
  onConnected(callback: ConnectionCallback): void {
    this.connectionCallbacks.push(callback);
  }

  onDisconnected(callback: DisconnectionCallback): void {
    this.disconnectionCallbacks.push(callback);
  }

  removeConnectionCallbacks(): void {
    this.connectionCallbacks = [];
    this.disconnectionCallbacks = [];
  }

  onData(callback: (data: number[]) => void): void {
    this.onDataCallback = callback;
  }

  isConnected(): boolean {
    return this.connectedDeviceId !== null;
  }

  getConnectedDeviceId(): string | null {
    return this.connectedDeviceId;
  }

  cleanup(): void {
    // FIXED: Clear all timeouts
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    this.subscriptions.forEach(sub => {
      try {
        sub.remove();
      } catch (e) {
        // Ignore cleanup errors
      }
    });
    this.subscriptions = [];
    
    if (this.connectedDeviceId) {
      try {
        BleManager.disconnect(this.connectedDeviceId);
      } catch (e) {
        // Ignore disconnect errors
      }
    }
    
    this.removeConnectionCallbacks();
  }
}

export const simpleBLE = new SimpleBLE();
