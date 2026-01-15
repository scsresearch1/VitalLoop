/**
 * Simple BLE Service
 * Minimal implementation: Enable, Scan, Connect, Receive Data
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
      console.log('✅ Connected:', data.peripheral);
      this.connectedDeviceId = data.peripheral;
      this.discoverServices(data.peripheral);
    });
    this.subscriptions.push(connectSub);

    // Disconnect event
    const disconnectSub = this.emitter.addListener('BleManagerDisconnectPeripheral', () => {
      console.log('❌ Disconnected');
      this.connectedDeviceId = null;
      this.serviceUUID = null;
      this.txChar = null;
      this.rxChar = null;
    });
    this.subscriptions.push(disconnectSub);

    // Data received
    const dataSub = this.emitter.addListener('BleManagerDidUpdateValueForCharacteristic', (data: any) => {
      try {
        // CRITICAL: Handle bridge type mismatch - value might be in different formats
        let value: number[] = [];
        
        if (Array.isArray(data)) {
          // Native sent array directly
          value = data;
        } else if (data && typeof data === 'object') {
          // Normal object format
          if (Array.isArray(data.value)) {
            value = data.value;
          } else if (data.value && typeof data.value === 'object') {
            // Convert object to array if needed
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

  async scanForRing(): Promise<Device[]> {
    if (!this._isInitialized) {
      await this.initialize();
    }

    console.log('🔍 Scanning for Ring...');
    const devices: Device[] = [];

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

    // Scan for new devices
    await BleManager.scan([], 10000, true);

    const scanSub = this.emitter?.addListener('BleManagerDiscoverPeripheral', (deviceData: any) => {
      try {
        // CRITICAL: Handle bridge type mismatch - native may send array instead of object
        // This prevents "expected Map, got array" errors
        let device: any;
        
        if (Array.isArray(deviceData)) {
          // Native sent array - convert to object
          device = {
            id: deviceData[0] || deviceData[1] || '',
            name: deviceData[1] || deviceData[2] || undefined,
            rssi: deviceData[2] || deviceData[3] || undefined,
          };
          console.log('⚠️ Device data received as array, converted to object');
        } else if (deviceData && typeof deviceData === 'object' && !Array.isArray(deviceData)) {
          // Normal object format
          device = {
            id: deviceData.id || deviceData.peripheral || deviceData.address || '',
            name: deviceData.name || deviceData.localName || undefined,
            rssi: deviceData.rssi || undefined,
          };
        } else {
          console.warn('Unknown device data format:', typeof deviceData, deviceData);
          return;
        }

        if (!device.id) {
          console.warn('Device missing ID, skipping');
          return;
        }

        const name = (device.name || '').toLowerCase();
        if (name.includes('ring') || name.includes('r11') || name.includes('r01') || name.includes('r02') || name.includes('r03')) {
          const exists = devices.some(d => d.id === device.id);
          if (!exists) {
            devices.push({ id: device.id, name: device.name, rssi: device.rssi });
            console.log('🔔 Found:', device.name || device.id);
          }
        }
      } catch (error) {
        console.error('Error processing discovered device:', error);
      }
    });
    this.subscriptions.push(scanSub);

    // Wait for scan to complete
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Stop scan
    try {
      await BleManager.stopScan();
    } catch (e) {
      // Ignore
    }

    if (scanSub) {
      scanSub.remove();
      // Remove from subscriptions array
      const index = this.subscriptions.indexOf(scanSub);
      if (index > -1) {
        this.subscriptions.splice(index, 1);
      }
    }

    console.log(`✅ Scan complete. Found ${devices.length} device(s)`);
    return devices;
  }

  async connect(deviceId: string): Promise<void> {
    if (!this._isInitialized) {
      await this.initialize();
    }

    console.log(`🔗 Connecting to ${deviceId}...`);
    await BleManager.connect(deviceId);
    // Connection confirmed via listener
  }

  private async discoverServices(deviceId: string): Promise<void> {
    console.log('🔍 Discovering services...');
    
    try {
      let info: any;
      
      try {
        info = await BleManager.retrieveServices(deviceId);
      } catch (bridgeError: any) {
        // CRITICAL: Handle React Native bridge type mismatch error
        // "UnexpectedNativeTypeException: expected Map, got a array"
        const errorMsg = bridgeError?.message || String(bridgeError);
        if (errorMsg.includes('expected Map') || 
            errorMsg.includes('got a array') || 
            errorMsg.includes('UnexpectedNativeTypeException')) {
          console.error('❌ Bridge type error detected:', errorMsg);
          console.error('This means retrieveServices() returned array instead of object');
          console.error('Possible causes:');
          console.error('  1. react-native-ble-manager version bug');
          console.error('  2. Native module serialization issue');
          console.error('  3. Device-specific BLE stack behavior');
          throw new Error('Bridge type mismatch: retrieveServices returned wrong format. Try reconnecting or check library version.');
        }
        throw bridgeError;
      }

      console.log('🔍 Raw retrieveServices result type:', typeof info, Array.isArray(info) ? 'ARRAY' : 'OBJECT');
      console.log('🔍 Raw retrieveServices result:', JSON.stringify(info, null, 2));

      // CRITICAL: Handle if native returns array instead of object (bridge bug workaround)
      if (Array.isArray(info)) {
        console.error('❌ CRITICAL: retrieveServices returned ARRAY instead of OBJECT');
        console.error('This is a react-native-ble-manager bridge bug');
        console.error('Array contents:', info);
        throw new Error('retrieveServices returned array - this is a library bug. Try reconnecting.');
      }

      // Handle different return formats - could be object, array, or nested
      let services: any[] = [];
      let characteristics: any[] = [];

      // Case 1: Direct object with services/characteristics arrays
      if (info && typeof info === 'object' && !Array.isArray(info)) {
        // Extract services
        if (Array.isArray(info.services)) {
          services = info.services;
        } else if (info.services && typeof info.services === 'object' && !Array.isArray(info.services)) {
          services = Object.values(info.services);
        } else if (info.serviceUUIDs && Array.isArray(info.serviceUUIDs)) {
          // Fallback: if only serviceUUIDs array exists, create service objects
          services = info.serviceUUIDs.map((uuid: string) => ({ uuid }));
        }

        // Extract characteristics
        if (Array.isArray(info.characteristics)) {
          characteristics = info.characteristics;
        } else if (info.characteristics && typeof info.characteristics === 'object' && !Array.isArray(info.characteristics)) {
          characteristics = Object.values(info.characteristics);
        }
      } else if (!info || typeof info !== 'object') {
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

      // Find characteristics that belong to this service
      const serviceCharacteristics = characteristics.filter((c: any) => {
        const charService = c?.service || c?.serviceUUID || '';
        return charService.toLowerCase() === this.serviceUUID.toLowerCase();
      });

      console.log(`🔍 Found ${serviceCharacteristics.length} characteristics for service`);

      const tx = serviceCharacteristics.find((c: any) => {
        const uuid = c?.characteristic || c?.uuid || c?.characteristicUUID || '';
        return uuid.toLowerCase().includes('fd03') || uuid.toLowerCase() === TX_CHAR.toLowerCase();
      });

      const rx = serviceCharacteristics.find((c: any) => {
        const uuid = c?.characteristic || c?.uuid || c?.characteristicUUID || '';
        return uuid.toLowerCase().includes('fd04') || uuid.toLowerCase() === RX_CHAR.toLowerCase();
      });

      if (!tx) {
        console.error('Available characteristics:', serviceCharacteristics.map(c => c?.characteristic || c?.uuid || 'unknown'));
        throw new Error(`TX characteristic not found (looking for ${TX_CHAR})`);
      }

      if (!rx) {
        console.error('Available characteristics:', serviceCharacteristics.map(c => c?.characteristic || c?.uuid || 'unknown'));
        throw new Error(`RX characteristic not found (looking for ${RX_CHAR})`);
      }

      this.txChar = tx.characteristic || tx.uuid || tx.characteristicUUID;
      this.rxChar = rx.characteristic || rx.uuid || rx.characteristicUUID;
      console.log('✅ TX:', this.txChar);
      console.log('✅ RX:', this.rxChar);

      // Enable notifications
      await BleManager.startNotification(deviceId, this.serviceUUID, this.rxChar);
      console.log('✅ Notifications enabled - ready to receive data');
    } catch (error: any) {
      console.error('❌ Service discovery failed:', error);
      console.error('Error details:', error.message, error.stack);
      throw error;
    }
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
    this.subscriptions.forEach(sub => sub.remove());
    this.subscriptions = [];
    if (this.connectedDeviceId) {
      BleManager.disconnect(this.connectedDeviceId);
    }
  }
}

export const simpleBLE = new SimpleBLE();
