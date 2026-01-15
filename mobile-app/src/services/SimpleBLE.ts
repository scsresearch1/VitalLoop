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
  private isInitialized = false;
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
    if (this.isInitialized) return;

    console.log('🔵 Initializing BLE...');

    // Check native module
    if (!BleManagerNative) {
      throw new Error('BLE native module not available');
    }

    // Request permissions
    const hasPermissions = await requestBLEPermissions();
    if (!hasPermissions) {
      throw new Error('Bluetooth permissions denied');
    }

    // Start BLE Manager
    await BleManager.start({ showAlert: false });
    console.log('✅ BLE Manager started');

    // Setup event listeners
    this.setupListeners();

    this.isInitialized = true;
    console.log('✅ BLE initialized');
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
    const dataSub = this.emitter.addListener('BleManagerDidUpdateValueForCharacteristic', (data: { value: number[] }) => {
      if (this.onDataCallback && data.value) {
        this.onDataCallback(data.value);
      }
    });
    this.subscriptions.push(dataSub);
  }

  async scanForRing(): Promise<Device[]> {
    if (!this.isInitialized) {
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

    const scanSub = this.emitter?.addListener('BleManagerDiscoverPeripheral', (device: any) => {
      const name = (device.name || '').toLowerCase();
      if (name.includes('ring') || name.includes('r11') || name.includes('r01') || name.includes('r02') || name.includes('r03')) {
        const exists = devices.some(d => d.id === device.id);
        if (!exists) {
          devices.push({ id: device.id, name: device.name, rssi: device.rssi });
          console.log('🔔 Found:', device.name || device.id);
        }
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
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log(`🔗 Connecting to ${deviceId}...`);
    await BleManager.connect(deviceId);
    // Connection confirmed via listener
  }

  private async discoverServices(deviceId: string): Promise<void> {
    console.log('🔍 Discovering services...');
    const info = await BleManager.retrieveServices(deviceId);

    // Find service
    const services = info.services || [];
    const service = services.find((s: any) => s.uuid?.toLowerCase() === SERVICE_UUID.toLowerCase());

    if (!service) {
      throw new Error('Ring service not found');
    }

    this.serviceUUID = service.uuid;
    console.log('✅ Service found:', this.serviceUUID);

    // Find characteristics
    const characteristics = info.characteristics || [];
    const tx = characteristics.find((c: any) => 
      c.service?.toLowerCase() === SERVICE_UUID.toLowerCase() && 
      (c.characteristic?.toLowerCase().includes('fd03') || c.characteristic?.toLowerCase() === TX_CHAR.toLowerCase())
    );
    const rx = characteristics.find((c: any) => 
      c.service?.toLowerCase() === SERVICE_UUID.toLowerCase() && 
      (c.characteristic?.toLowerCase().includes('fd04') || c.characteristic?.toLowerCase() === RX_CHAR.toLowerCase())
    );

    if (!tx || !rx) {
      throw new Error('TX or RX characteristic not found');
    }

    this.txChar = tx.characteristic;
    this.rxChar = rx.characteristic;
    console.log('✅ TX:', this.txChar);
    console.log('✅ RX:', this.rxChar);

    // Enable notifications
    await BleManager.startNotification(deviceId, this.serviceUUID, this.rxChar);
    console.log('✅ Notifications enabled - ready to receive data');
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
