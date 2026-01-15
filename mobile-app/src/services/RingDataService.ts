/**
 * Ring Data Service
 * High-level service for fetching and managing ring data
 */

import { bleManager } from './BLEManager';
import { dataParser } from './DataParser';
import { multiPacketHandler } from './MultiPacketHandler';
import { dataStorageService } from './DataStorageService';
import { Opcode } from '../types/ble';
import { RingData, HeartRateData, SleepData, BloodPressureData, HRVData, ActivityData } from '../models/RingData';

class RingDataService {
  /**
   * Fetch all available data from the ring
   */
  async fetchAllData(): Promise<Partial<RingData>> {
    const data: Partial<RingData> = {
      heartRateHistory: [],
      sleepData: [],
      bloodPressure: [],
      hrvData: [],
      activity: [],
      sportSessions: [],
      lastUpdated: Date.now(),
    };

    try {
      // Fetch battery first
      const batteryInfo = await this.fetchBattery();
      data.deviceInfo = { 
        macAddress: '',
        model: 'Unknown',
        isConnected: false,
        ...(data.deviceInfo || {}), 
        ...batteryInfo 
      } as RingData['deviceInfo'];

      // Fetch device info
      try {
        const deviceInfo = await this.fetchDeviceInfo();
        data.deviceInfo = { 
          ...data.deviceInfo,
          ...deviceInfo 
        } as RingData['deviceInfo'];
      } catch (error) {
        console.warn('Failed to fetch device info:', error);
      }

      // Fetch heart rate history
      try {
        const hrHistory = await this.fetchHeartRateHistory();
        data.heartRateHistory = hrHistory;
      } catch (error) {
        console.warn('Failed to fetch heart rate history:', error);
      }

      // Fetch sleep data
      try {
        const sleepData = await this.fetchSleepData();
        data.sleepData = sleepData;
      } catch (error) {
        console.warn('Failed to fetch sleep data:', error);
      }

      // Fetch blood pressure
      try {
        const bpData = await this.fetchBloodPressure();
        data.bloodPressure = bpData;
      } catch (error) {
        console.warn('Failed to fetch blood pressure:', error);
      }

      // Fetch HRV data
      try {
        const hrvData = await this.fetchHRVData();
        data.hrvData = hrvData;
      } catch (error) {
        console.warn('Failed to fetch HRV data:', error);
      }

      // Fetch activity data
      try {
        const activityData = await this.fetchActivityData();
        if (activityData) {
          data.activity = [activityData as ActivityData];
        }
      } catch (error) {
        console.warn('Failed to fetch activity data:', error);
      }
    } catch (error) {
      console.error('Error fetching ring data:', error);
    }

    // Save fetched data to storage
    if (data && Object.keys(data).length > 0) {
      try {
        await dataStorageService.saveRingData(data);
      } catch (error) {
        console.error('Failed to save data to storage:', error);
        // Continue even if save fails
      }
    }

    return data;
  }

  /**
   * Fetch battery level
   */
  async fetchBattery(): Promise<Partial<RingData['deviceInfo']>> {
    const response = await bleManager.sendCommand(Opcode.GET_BATTERY);
    return dataParser.parseBattery(response);
  }

  /**
   * Fetch device info / firmware version
   */
  async fetchDeviceInfo(): Promise<Partial<RingData['deviceInfo']>> {
    try {
      const response = await bleManager.sendCommand(Opcode.APP_REVISION_REQ);
      return dataParser.parseDeviceInfo(response);
    } catch (error) {
      console.warn('App revision not available, trying device info');
      try {
        const response = await bleManager.sendCommand(Opcode.GET_DEVICE_INFO);
        return dataParser.parseDeviceInfo(response);
      } catch (e) {
        return {};
      }
    }
  }

  /**
   * Fetch heart rate history
   */
  async fetchHeartRateHistory(): Promise<HeartRateData[]> {
    // Clear buffer
    multiPacketHandler.clearBuffer(Opcode.READ_HEART_RATE_REQ);
    
    // Send request
    await bleManager.sendCommand(Opcode.READ_HEART_RATE_REQ);
    
    // Wait for multi-packet response (give it time)
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Parse complete data
    return dataParser.parseHeartRateHistory(Opcode.READ_HEART_RATE_REQ);
  }

  /**
   * Fetch sleep data
   */
  async fetchSleepData(date?: Date): Promise<SleepData[]> {
    multiPacketHandler.clearBuffer(Opcode.READ_SLEEP_DETAILS_REQ);
    
    // Build request payload (date in BCD format if needed)
    const payload: number[] = [];
    if (date) {
      const year = date.getFullYear() - 2000;
      payload.push(this.decimalToBCD(year));
      payload.push(this.decimalToBCD(date.getMonth() + 1));
      payload.push(this.decimalToBCD(date.getDate()));
    }
    
    await bleManager.sendCommand(Opcode.READ_SLEEP_DETAILS_REQ, payload);
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    return dataParser.parseSleepData(Opcode.READ_SLEEP_DETAILS_REQ);
  }

  /**
   * Fetch blood pressure data
   */
  async fetchBloodPressure(): Promise<BloodPressureData[]> {
    multiPacketHandler.clearBuffer(Opcode.READ_PRESSURE_REQ);
    
    await bleManager.sendCommand(Opcode.READ_PRESSURE_REQ);
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    return dataParser.parseBloodPressure(Opcode.READ_PRESSURE_REQ);
  }

  /**
   * Fetch HRV data
   */
  async fetchHRVData(): Promise<HRVData[]> {
    multiPacketHandler.clearBuffer(Opcode.HRV_REQ);
    
    await bleManager.sendCommand(Opcode.HRV_REQ);
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    return dataParser.parseHRV(Opcode.HRV_REQ);
  }

  /**
   * Fetch total sport/activity data (steps, calories, distance)
   */
  async fetchActivityData(): Promise<Partial<ActivityData> | null> {
    multiPacketHandler.clearBuffer(Opcode.READ_TOTAL_SPORT_DATA_REQ);
    
    try {
      await bleManager.sendCommand(Opcode.READ_TOTAL_SPORT_DATA_REQ);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return dataParser.parseTotalSportData(Opcode.READ_TOTAL_SPORT_DATA_REQ);
    } catch (error) {
      console.warn('Failed to fetch activity data:', error);
      return null;
    }
  }

  /**
   * Start real-time heart rate monitoring
   */
  async startRealTimeHeartRate(
    onHeartRate: (data: HeartRateData) => void
  ): Promise<() => void> {
    // Start monitoring
    await bleManager.sendCommand(Opcode.START_HEART_RATE);

    // Register listener for real-time notifications (opcode 0x1E)
    const unsubscribe = bleManager.onNotification(Opcode.REAL_TIME_HEART_RATE, async (data) => {
      const hrData = dataParser.parseRealTimeHeartRate(data);
      if (hrData) {
        // Save to storage automatically
        try {
          await dataStorageService.addHeartRateData(hrData);
        } catch (error) {
          console.error('Failed to save heart rate to storage:', error);
        }
        onHeartRate(hrData);
      }
    });

    // Return stop function
    return async () => {
      unsubscribe();
      try {
        await bleManager.sendCommand(Opcode.STOP_HEART_RATE);
      } catch (error) {
        console.error('Failed to stop heart rate:', error);
      }
    };
  }

  /**
   * Load stored data from local storage
   */
  async loadStoredData(): Promise<Partial<RingData>> {
    return await dataStorageService.loadRingData();
  }

  /**
   * Update stored data (merge with existing)
   */
  async updateStoredData(updates: Partial<RingData>): Promise<void> {
    await dataStorageService.updateRingData(updates);
  }

  /**
   * Helper: Convert decimal to BCD
   */
  private decimalToBCD(decimal: number): number {
    return ((Math.floor(decimal / 10) << 4) | (decimal % 10)) & 0xFF;
  }
}

export const ringDataService = new RingDataService();
