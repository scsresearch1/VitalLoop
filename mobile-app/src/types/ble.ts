/**
 * BLE Protocol Types
 * Based on BLE_PROTOCOL_SPECIFICATION.md
 */

// GATT Service UUIDs
export const GATT_SERVICE_UUID = '000002fd-3C17-D293-8E48-14FE2E4DA212';
export const GATT_TX_CHARACTERISTIC_UUID = '0000fd03-0000-1000-8000-00805f9b34fb'; // 0xFD03
export const GATT_RX_CHARACTERISTIC_UUID = '0000fd04-0000-1000-8000-00805f9b34fb'; // 0xFD04
export const GATT_CCCD_UUID = '00002902-0000-1000-8000-00805f9b34fb';

// Large Data Service UUIDs
export const LARGE_DATA_SERVICE_UUID = 'de5bf728-d711-4e47-af26-65e3012a5dc7';
export const LARGE_DATA_TX_UUID = 'de5bf729-d711-4e47-af26-65e3012a5dc7';
export const LARGE_DATA_RX_UUID = 'de5bf72a-d711-4e47-af26-65e3012a5dc7';

// Frame Constants
export const FRAME_SIZE = 16;
export const OPCODE_MASK = 0x7F; // Clear bit 7 (0x80)

// Common Opcodes (from BLE_PROTOCOL_SPECIFICATION.md)
export enum Opcode {
  // Device Info
  GET_DEVICE_INFO = 0x01,
  GET_BATTERY = 0x03, // BatteryRsp
  
  // Heart Rate
  READ_HEART_RATE_REQ = 0x15, // ReadHeartRateReq → ReadHeartRateRsp (history)
  REAL_TIME_HEART_RATE = 0x1E, // RealTimeHeartRateRsp (live notifications)
  START_HEART_RATE = 0x69, // StartHeartRateReq
  STOP_HEART_RATE = 0x6A, // StopHeartRateReq
  
  // Sleep
  READ_SLEEP_DETAILS_REQ = 0x44, // ReadSleepDetailsReq → ReadSleepDetailsRsp
  
  // Blood Pressure
  READ_PRESSURE_REQ = 0x14, // ReadPressureReq → ReadBlePressureRsp
  
  // Sport/Activity
  READ_BAND_SPORT_REQ = 0x13, // ReadBandSportReq → ReadDetailSportDataRsp
  READ_TOTAL_SPORT_DATA_REQ = 0x07, // ReadTotalSportDataReq → TotalSportDataRsp
  TODAY_SPORT_DATA = 0x48, // TodaySportDataRsp
  
  // HRV
  HRV_REQ = 0x39, // HRVReq → HRVRsp
  HRV_SETTING_REQ = 0x38, // HrvSettingReq → HRVSettingRsp
  
  // Device Notifications
  DEVICE_NOTIFY = 0x73, // DeviceNotifyRsp (catch-all notification)
  
  // Device Capabilities
  DEVICE_SUPPORT_REQ = 0x3C, // DeviceSupportReq → DeviceSupportFunctionRsp
  
  // App Revision
  APP_REVISION_REQ = 0xA1, // AppRevisionReq → AppRevisionResp
  
  // Time Sync
  SYNC_TIME = 0x90,
}

export interface BLEFrame {
  opcode: number;
  payload: number[];
  crc: number;
}

export interface DeviceInfo {
  macAddress: string;
  model: string;
  firmwareVersion?: string;
  batteryLevel?: number;
  isConnected: boolean;
}

export interface ConnectionState {
  isScanning: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  connectedDevice?: DeviceInfo;
  error?: string;
}

// Device type from react-native-ble-manager (safe fallback)
export interface BLEDevice {
  id: string;
  name?: string;
  rssi?: number;
  advertising?: {
    serviceUUIDs?: string[];
    manufacturerData?: string;
    txPowerLevel?: number;
    solicitedServiceUUIDs?: string[];
    serviceData?: Record<string, string>;
    isConnectable?: boolean;
  };
}
