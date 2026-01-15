/**
 * BLE Manager Service
 * Handles Bluetooth Low Energy connection and communication with the Ring
 */

import { Device, BleManager, State } from 'react-native-ble-manager';
import {
  GATT_SERVICE_UUID,
  GATT_TX_CHARACTERISTIC_UUID,
  GATT_RX_CHARACTERISTIC_UUID,
  GATT_CCCD_UUID,
  ConnectionState,
  DeviceInfo,
  Opcode,
} from '../types/ble';
import { buildFrame, extractOpcode, validateCRC8 } from '../utils/crc';
import { multiPacketHandler } from './MultiPacketHandler';
import { logger } from '../utils/Logger';

class BLEManagerService {
  private bleManager: BleManager;
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

  constructor() {
    this.bleManager = new BleManager();
    this.connectionState = {
      isScanning: false,
      isConnecting: false,
      isConnected: false,
    };
    this.setupListeners();
  }

  private setupListeners() {
    // BLE State changes
    this.bleManager.addListener('BleManagerDidUpdateState', (args: { state: State }) => {
      logger.log('BLE State changed:', args.state);
    });

    // Characteristic notifications
    this.bleManager.addListener(
      'BleManagerDidUpdateValueForCharacteristic',
      (data: { value: number[]; characteristic: string; peripheral: string }) => {
        this.handleNotification(data.value, data.characteristic);
      }
    );

    // Connection events
    this.bleManager.addListener('BleManagerConnectPeripheral', (data: { peripheral: string }) => {
      logger.log('✅ Connected to device:', data.peripheral);
      this.connectionState.isConnecting = false;
      this.connectionState.isConnected = true;
      this.connectedDeviceId = data.peripheral;
      this.discoverServices(data.peripheral);
    });

    this.bleManager.addListener('BleManagerDisconnectPeripheral', (data: { peripheral: string }) => {
      logger.log('❌ Disconnected from device:', data.peripheral);
      this.connectionState.isConnected = false;
      this.connectedDeviceId = null;
    });
  }

  /**
   * Initialize BLE Manager
   */
  async initialize(): Promise<void> {
    try {
      await this.bleManager.start({ showAlert: false });
      logger.log('✅ BLE Manager initialized');
    } catch (error) {
      logger.error('Failed to initialize BLE:', error);
      // Don't throw - allow app to continue without BLE
      // The app can still function, just without BLE features
      logger.warn('App will continue without BLE support');
      // Set connection state to indicate BLE is not available
      this.connectionState.isConnected = false;
    }
  }

  /**
   * Scan for Ring devices
   * @param duration - Scan duration in milliseconds (default: 5000)
   */
  async scanForDevices(duration: number = 5000): Promise<Device[]> {
    if (this.connectionState.isScanning) {
      return [];
    }

    this.connectionState.isScanning = true;
    const foundDevices: Device[] = [];

    try {
      // Start scan
      await this.bleManager.scan([], duration, true);

      // Listen for discovered devices
      const scanListener = this.bleManager.addListener(
        'BleManagerDiscoverPeripheral',
        (device: Device) => {
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
    if (this.connectionState.isConnecting || this.connectionState.isConnected) {
      throw new Error('Already connecting or connected');
    }

    this.connectionState.isConnecting = true;
    this.connectionState.error = undefined;

    try {
      await this.bleManager.connect(deviceId);
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
      const services = await this.bleManager.retrieveServices(deviceId);
      
      // Find main service
      const mainService = services.find(s => s.uuid.toLowerCase() === GATT_SERVICE_UUID.toLowerCase());
      
      if (!mainService) {
        throw new Error('Main service not found');
      }

      this.serviceUUID = mainService.uuid;

      // Find TX and RX characteristics
      const txChar = mainService.characteristics?.find(
        c => c.uuid.toLowerCase().includes('fd03') || c.uuid.toLowerCase() === GATT_TX_CHARACTERISTIC_UUID.toLowerCase()
      );
      
      const rxChar = mainService.characteristics?.find(
        c => c.uuid.toLowerCase().includes('fd04') || c.uuid.toLowerCase() === GATT_RX_CHARACTERISTIC_UUID.toLowerCase()
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
      await this.bleManager.startNotification(deviceId, this.serviceUUID!, characteristicUUID);
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
    }

    // Check if this is a response to a pending request
    const pendingRequest = this.pendingRequests.get(opcode);
    if (pendingRequest && !hasMorePackets) {
      // Multi-packet complete, resolve with complete data
      logger.debug(`Multi-packet complete for opcode 0x${opcode.toString(16)}`);
      clearTimeout(pendingRequest.timeout);
      this.pendingRequests.delete(opcode);
      pendingRequest.resolve(data);
      return;
    } else if (pendingRequest && hasMorePackets) {
      // More packets coming, don't resolve yet
      logger.debug(`Waiting for more packets for opcode 0x${opcode.toString(16)}`);
      return;
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
      await this.bleManager.write(
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
   */
  async disconnect(): Promise<void> {
    if (this.connectedDeviceId) {
      try {
        await this.bleManager.disconnect(this.connectedDeviceId);
      } catch (error) {
        console.error('Disconnect error:', error);
      }
    }
    this.connectionState.isConnected = false;
    this.connectedDeviceId = null;
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.bleManager.destroy();
    this.listeners.clear();
    this.pendingRequests.forEach(req => clearTimeout(req.timeout));
    this.pendingRequests.clear();
  }
}

// Singleton instance
export const bleManager = new BLEManagerService();
