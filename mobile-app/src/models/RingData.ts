/**
 * Ring Data Models
 * Based on COMPREHENSIVE_KNOWLEDGE_BASE.md
 */

export interface HeartRateData {
  timestamp: number;
  heartRate: number; // bpm
  quality?: number; // Signal quality 0-100
}

export interface SleepStage {
  startTime: number;
  endTime: number;
  stage: 'deep' | 'light' | 'rem' | 'awake';
  duration: number; // minutes
}

export interface SleepData {
  date: string; // YYYY-MM-DD
  startTime: number;
  endTime: number;
  totalDuration: number; // minutes
  deepSleep: number; // minutes
  lightSleep: number; // minutes
  remSleep: number; // minutes
  awakeTime: number; // minutes
  quality: number; // 0-100
  stages: SleepStage[];
}

export interface BloodPressureData {
  timestamp: number;
  systolic: number; // mmHg
  diastolic: number; // mmHg
  pulse: number; // bpm
}

export interface HRVData {
  timestamp: number;
  rmssd: number; // ms
  sdnn: number; // ms
  pnn50: number; // percentage
  lf: number; // Low frequency power
  hf: number; // High frequency power
  lfHfRatio: number;
}

export interface ActivityData {
  timestamp: number;
  steps: number;
  calories: number; // kcal
  distance: number; // meters
  activeMinutes: number;
}

export interface SportSession {
  id: string;
  type: 'running' | 'cycling' | 'walking' | 'strength' | 'yoga' | 'hiit' | 'other';
  startTime: number;
  endTime: number;
  duration: number; // seconds
  calories: number;
  distance: number; // meters
  avgHeartRate: number;
  maxHeartRate: number;
  steps?: number;
}

export interface DeviceStatus {
  batteryLevel: number; // 0-100
  isCharging: boolean;
  firmwareVersion?: string;
  hardwareVersion?: string;
  lastSyncTime?: number;
}

export interface RealTimeMetrics {
  timestamp: number;
  heartRate?: number; // bpm
  spo2?: number; // Blood oxygen saturation (0-100%)
  temperature?: number; // Body temperature (°C)
  quality?: number; // Signal quality 0-100
  // Additional metrics that might be in the payload
  [key: string]: number | undefined;
}

export interface RingData {
  deviceInfo: DeviceStatus;
  currentHeartRate?: HeartRateData;
  currentMetrics?: RealTimeMetrics; // Real-time combined metrics
  heartRateHistory: HeartRateData[];
  sleepData: SleepData[];
  bloodPressure: BloodPressureData[];
  hrvData: HRVData[];
  activity: ActivityData[];
  sportSessions: SportSession[];
  lastUpdated: number;
}
