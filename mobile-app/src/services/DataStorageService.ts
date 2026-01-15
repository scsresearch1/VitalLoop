/**
 * Data Storage Service
 * Handles local persistence of ring health data using AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { RingData, HeartRateData, SleepData, BloodPressureData, HRVData, ActivityData, DeviceStatus } from '../models/RingData';

const STORAGE_KEYS = {
  RING_DATA: '@VitalLoop:ringData',
  LAST_UPDATED: '@VitalLoop:lastUpdated',
  DEVICE_INFO: '@VitalLoop:deviceInfo',
} as const;

/**
 * Default/empty data structure for first-time users
 */
export function getDefaultRingData(): Partial<RingData> {
  return {
    deviceInfo: {
      batteryLevel: 0,
      isCharging: false,
      lastSyncTime: undefined,
    },
    currentHeartRate: undefined,
    heartRateHistory: [],
    sleepData: [],
    bloodPressure: [],
    hrvData: [],
    activity: [],
    sportSessions: [],
    lastUpdated: Date.now(),
  };
}

class DataStorageService {
  /**
   * Save complete ring data to storage
   */
  async saveRingData(data: Partial<RingData>): Promise<void> {
    try {
      const dataToSave = {
        ...data,
        lastUpdated: Date.now(),
      };
      
      const jsonData = JSON.stringify(dataToSave);
      await AsyncStorage.setItem(STORAGE_KEYS.RING_DATA, jsonData);
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_UPDATED, Date.now().toString());
      
      console.log('✅ Ring data saved to storage');
    } catch (error) {
      console.error('❌ Failed to save ring data:', error);
      throw error;
    }
  }

  /**
   * Load ring data from storage
   * Returns default empty data if nothing is stored
   */
  async loadRingData(): Promise<Partial<RingData>> {
    try {
      const jsonData = await AsyncStorage.getItem(STORAGE_KEYS.RING_DATA);
      
      if (!jsonData) {
        console.log('📦 No stored data found, returning defaults');
        return getDefaultRingData();
      }

      const data = JSON.parse(jsonData) as Partial<RingData>;
      console.log('✅ Ring data loaded from storage');
      return data;
    } catch (error) {
      console.error('❌ Failed to load ring data:', error);
      // Return defaults on error
      return getDefaultRingData();
    }
  }

  /**
   * Save device info separately (for quick access)
   */
  async saveDeviceInfo(deviceInfo: DeviceStatus): Promise<void> {
    try {
      const jsonData = JSON.stringify(deviceInfo);
      await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_INFO, jsonData);
    } catch (error) {
      console.error('Failed to save device info:', error);
    }
  }

  /**
   * Load device info
   */
  async loadDeviceInfo(): Promise<DeviceStatus | null> {
    try {
      const jsonData = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_INFO);
      if (!jsonData) return null;
      return JSON.parse(jsonData) as DeviceStatus;
    } catch (error) {
      console.error('Failed to load device info:', error);
      return null;
    }
  }

  /**
   * Update specific data fields (merge with existing)
   */
  async updateRingData(updates: Partial<RingData>): Promise<void> {
    try {
      const existing = await this.loadRingData();
      const merged = {
        ...existing,
        ...updates,
        // Merge arrays properly
        heartRateHistory: updates.heartRateHistory || existing.heartRateHistory || [],
        sleepData: updates.sleepData || existing.sleepData || [],
        bloodPressure: updates.bloodPressure || existing.bloodPressure || [],
        hrvData: updates.hrvData || existing.hrvData || [],
        activity: updates.activity || existing.activity || [],
        sportSessions: updates.sportSessions || existing.sportSessions || [],
        lastUpdated: Date.now(),
      };
      
      await this.saveRingData(merged);
    } catch (error) {
      console.error('Failed to update ring data:', error);
      throw error;
    }
  }

  /**
   * Add new heart rate data point (append to history)
   */
  async addHeartRateData(hrData: HeartRateData): Promise<void> {
    try {
      const existing = await this.loadRingData();
      const history = existing.heartRateHistory || [];
      
      // Add new data point
      const updatedHistory = [...history, hrData];
      
      // Keep only last 1000 data points to prevent storage bloat
      const trimmedHistory = updatedHistory.slice(-1000);
      
      await this.updateRingData({
        currentHeartRate: hrData,
        heartRateHistory: trimmedHistory,
      });
    } catch (error) {
      console.error('Failed to add heart rate data:', error);
    }
  }

  /**
   * Add new activity data
   */
  async addActivityData(activityData: ActivityData): Promise<void> {
    try {
      const existing = await this.loadRingData();
      const activities = existing.activity || [];
      
      // Replace or add activity for today
      const today = new Date().toDateString();
      const todayTimestamp = new Date(today).getTime();
      
      const filtered = activities.filter(a => {
        const activityDate = new Date(a.timestamp).toDateString();
        return activityDate !== today;
      });
      
      await this.updateRingData({
        activity: [...filtered, activityData],
      });
    } catch (error) {
      console.error('Failed to add activity data:', error);
    }
  }

  /**
   * Clear all stored data (for testing or reset)
   */
  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.RING_DATA,
        STORAGE_KEYS.LAST_UPDATED,
        STORAGE_KEYS.DEVICE_INFO,
      ]);
      console.log('✅ All ring data cleared from storage');
    } catch (error) {
      console.error('Failed to clear data:', error);
      throw error;
    }
  }

  /**
   * Get last update timestamp
   */
  async getLastUpdated(): Promise<number | null> {
    try {
      const timestamp = await AsyncStorage.getItem(STORAGE_KEYS.LAST_UPDATED);
      return timestamp ? parseInt(timestamp, 10) : null;
    } catch (error) {
      console.error('Failed to get last updated:', error);
      return null;
    }
  }

  /**
   * Check if data exists in storage
   */
  async hasStoredData(): Promise<boolean> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.RING_DATA);
      return data !== null;
    } catch (error) {
      return false;
    }
  }
}

export const dataStorageService = new DataStorageService();
