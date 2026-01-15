/**
 * Data Parser Service
 * Parses BLE frame responses into structured data
 * Based on BLE_PROTOCOL_SPECIFICATION.md and COMPREHENSIVE_KNOWLEDGE_BASE.md
 */

import { extractOpcode } from '../utils/crc';
import {
  HeartRateData,
  SleepData,
  BloodPressureData,
  HRVData,
  ActivityData,
  SportSession,
  DeviceStatus,
} from '../models/RingData';
import { multiPacketHandler } from './MultiPacketHandler';
import { logger } from '../utils/Logger';

class DataParserService {
  /**
   * Parse real-time heart rate notification (opcode 0x1E)
   * Format: payload[0] = HR value, payload[1] = quality (optional)
   */
  parseRealTimeHeartRate(frame: number[]): HeartRateData | null {
    if (frame.length < 16) {
      logger.warn('Invalid frame length for real-time HR');
      return null;
    }

    const payload = frame.slice(1, 15);
    const heartRate = payload[0] & 0xFF;
    const quality = payload[1] || 100;
    const timestamp = Date.now();

    if (heartRate === 0 || heartRate > 250) {
      logger.warn(`Invalid HR value: ${heartRate} bpm`);
      return null; // Invalid HR value
    }

    logger.logData('Real-time Heart Rate', { heartRate, quality, timestamp });

    return {
      timestamp,
      heartRate,
      quality,
    };
  }

  /**
   * Parse heart rate history (opcode 0x15)
   * Multi-packet: Header (0x00) + Timestamp (0x01) + Data packets (0x02+)
   * Record format: 13 bytes = timestamp (4) + HR (1) + reserved (8)
   */
  parseHeartRateHistory(opcode: number): HeartRateData[] {
    const packets = multiPacketHandler.getOrderedPackets(opcode);
    logger.debug(`Parsing HR history: ${packets.length} packets received`);
    
    if (packets.length < 2) {
      logger.warn('Not enough packets for HR history');
      return [];
    }

    const records: HeartRateData[] = [];
    
    // Skip header (packet 0) and timestamp packet (packet 1)
    for (let i = 2; i < packets.length; i++) {
      const packet = packets[i];
      if (!packet || packet.length < 14) continue;

      // Each packet can contain multiple 13-byte records
      // Packet structure: [index, record1(13), record2(13), ...]
      let offset = 1; // Skip packet index
      
      while (offset + 13 <= packet.length) {
        const record = packet.slice(offset, offset + 13);
        
        // Parse timestamp (4 bytes, little-endian, UTC seconds)
        const timestampSeconds = (record[0] | (record[1] << 8) | (record[2] << 16) | (record[3] << 24)) >>> 0;
        const heartRate = record[4] & 0xFF;
        
        if (heartRate > 0 && heartRate <= 250 && timestampSeconds > 0) {
          records.push({
            timestamp: timestampSeconds * 1000, // Convert to milliseconds
            heartRate,
            quality: 100, // Default quality for historical data
          });
        } else {
          logger.debug(`Skipping invalid HR record: HR=${heartRate}, TS=${timestampSeconds}`);
        }
        
        offset += 13;
      }
    }

    logger.log(`Parsed ${records.length} HR history records`);
    return records;
  }

  /**
   * Parse battery response (opcode 0x03)
   * Format: payload[0] = battery level (0-100), payload[1] = charging flag
   */
  parseBattery(frame: number[]): Partial<DeviceStatus> {
    if (frame.length < 16) {
      logger.warn('Invalid frame length for battery');
      return {};
    }

    const payload = frame.slice(1, 15);
    const batteryLevel = payload[0] & 0xFF;
    const isCharging = (payload[1] & 0x01) !== 0;

    const result = {
      batteryLevel: Math.min(100, Math.max(0, batteryLevel)),
      isCharging,
    };

    logger.logData('Battery', result);
    return result;
  }

  /**
   * Parse device info / app revision (opcode 0xA1)
   */
  parseDeviceInfo(frame: number[]): Partial<DeviceStatus> {
    if (frame.length < 16) return {};

    const payload = frame.slice(1, 15);
    
    // Try to parse firmware version (may vary by device)
    // Look for printable ASCII in payload
    let firmwareVersion: string | undefined;
    for (let i = 0; i < payload.length - 3; i++) {
      const bytes = payload.slice(i, i + 4);
      if (bytes.every(b => (b >= 32 && b <= 126) || b === 0)) {
        const str = bytes.map(b => b === 0 ? '' : String.fromCharCode(b)).join('').trim();
        if (str.length >= 2 && /^[\d.]+$/.test(str)) {
          firmwareVersion = str;
          break;
        }
      }
    }

    return {
      firmwareVersion,
    };
  }

  /**
   * Parse sleep data (opcode 0x44)
   * Multi-packet: Init (0xF0) + Data packets with BCD date
   * Format: [year(BCD), month(BCD), day(BCD), timeIndex, packetIndex, totalPackets-1, quality[8]]
   */
  parseSleepData(opcode: number): SleepData[] {
    const packets = multiPacketHandler.getOrderedPackets(opcode);
    if (packets.length < 2) return [];

    const sleepRecords: SleepData[] = [];
    const sleepDataByDate: Map<string, { qualities: number[]; date: string }> = new Map();

    // Skip init packet (0xF0)
    for (let i = 1; i < packets.length; i++) {
      const packet = packets[i];
      if (!packet || packet.length < 14) continue;

      // Parse BCD date
      const year = this.bcdToDecimal(packet[0]) + 2000;
      const month = this.bcdToDecimal(packet[1]);
      const day = this.bcdToDecimal(packet[2]);
      const timeIndex = packet[3]; // 5-minute interval index (0-287)
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // Get sleep qualities (8 bytes = 8 * 5 minutes = 40 minutes of data)
      const qualities = packet.slice(6, 14);

      if (!sleepDataByDate.has(dateStr)) {
        sleepDataByDate.set(dateStr, { qualities: new Array(288).fill(0), date: dateStr });
      }

      const dayData = sleepDataByDate.get(dateStr)!;
      // Copy qualities into the correct time slots
      for (let j = 0; j < qualities.length && timeIndex + j < 288; j++) {
        dayData.qualities[timeIndex + j] = qualities[j];
      }
    }

    // Convert to SleepData objects
    for (const [date, data] of sleepDataByDate.entries()) {
      const qualities = data.qualities;
      const totalQuality = qualities.reduce((sum, q) => sum + q, 0) / qualities.length;
      
      // Estimate sleep stages from quality values (simplified)
      const deepSleep = qualities.filter(q => q > 200).length * 5; // High quality = deep sleep
      const lightSleep = qualities.filter(q => q > 100 && q <= 200).length * 5;
      const remSleep = qualities.filter(q => q > 150 && q <= 200).length * 5;
      const awakeTime = qualities.filter(q => q <= 50).length * 5;

      sleepRecords.push({
        date,
        startTime: new Date(date).getTime(),
        endTime: new Date(date).getTime() + (24 * 60 * 60 * 1000),
        totalDuration: (deepSleep + lightSleep + remSleep),
        deepSleep,
        lightSleep,
        remSleep,
        awakeTime,
        quality: Math.round(totalQuality / 2.55), // Convert 0-255 to 0-100
        stages: [], // Would need more processing to determine actual stages
      });
    }

    return sleepRecords;
  }

  /**
   * Parse blood pressure data (opcode 0x14)
   * Format: 6 bytes per record = timestamp(4) + DBP(1) + SBP(1)
   * 50 records per batch, end marker: timestamp 0xFFFFFFFF
   */
  parseBloodPressure(opcode: number): BloodPressureData[] {
    const packets = multiPacketHandler.getOrderedPackets(opcode);
    if (packets.length === 0) return [];

    const records: BloodPressureData[] = [];

    for (const packet of packets) {
      if (!packet || packet.length < 6) continue;

      // Each packet can contain multiple 6-byte records
      let offset = 0;
      
      while (offset + 6 <= packet.length) {
        const record = packet.slice(offset, offset + 6);
        
        // Parse timestamp (4 bytes, little-endian, UTC seconds)
        const timestamp = (record[0] | (record[1] << 8) | (record[2] << 16) | (record[3] << 24)) >>> 0;
        
        // Check for end marker
        if (timestamp === 0xFFFFFFFF) {
          break;
        }

        const diastolic = record[4] & 0xFF;
        const systolic = record[5] & 0xFF;

        if (systolic > 0 && diastolic > 0 && systolic < 300 && diastolic < 300) {
          records.push({
            timestamp: timestamp * 1000, // Convert to milliseconds
            systolic,
            diastolic,
            pulse: 0, // Not in BP record
          });
        }

        offset += 6;
      }
    }

    return records;
  }

  /**
   * Parse HRV data (opcode 0x39)
   * Same structure as heart rate history
   */
  parseHRV(opcode: number): HRVData[] {
    const packets = multiPacketHandler.getOrderedPackets(opcode);
    if (packets.length < 2) return [];

    const records: HRVData[] = [];

    // Similar to heart rate parsing
    for (let i = 2; i < packets.length; i++) {
      const packet = packets[i];
      if (!packet || packet.length < 14) continue;

      let offset = 1;
      while (offset + 13 <= packet.length) {
        const record = packet.slice(offset, offset + 13);
        const timestampSeconds = (record[0] | (record[1] << 8) | (record[2] << 16) | (record[3] << 24)) >>> 0;
        
        // HRV value interpretation (may need adjustment based on actual format)
        const hrvValue = record[4] & 0xFF;

        if (timestampSeconds > 0 && hrvValue > 0) {
          records.push({
            timestamp: timestampSeconds * 1000,
            rmssd: hrvValue, // Simplified - actual HRV has multiple metrics
            sdnn: hrvValue * 1.5,
            pnn50: 0,
            lf: 0,
            hf: 0,
            lfHfRatio: 0,
          });
        }

        offset += 13;
      }
    }

    return records;
  }

  /**
   * Parse device notify (opcode 0x73) - catch-all notification
   */
  parseDeviceNotify(frame: number[]): { dataType: number; payload: number[] } | null {
    if (frame.length < 16) return null;

    const payload = frame.slice(1, 15);
    const dataType = payload[0] & 0xFF;

    return {
      dataType,
      payload: payload.slice(1),
    };
  }

  /**
   * Parse total sport data (opcode 0x07)
   * 2-packet response: steps, running steps, calories, distance, sport duration, sleep duration
   */
  parseTotalSportData(opcode: number): Partial<ActivityData> | null {
    const packets = multiPacketHandler.getOrderedPackets(opcode);
    if (packets.length < 2) {
      logger.warn('Not enough packets for total sport data');
      return null;
    }

    // Combine packets (skip packet index bytes)
    const data: number[] = [];
    for (let i = 0; i < packets.length; i++) {
      const packet = packets[i];
      if (packet && packet.length > 1) {
        data.push(...packet.slice(1)); // Skip packet index
      }
    }

    if (data.length < 18) {
      logger.warn('Invalid total sport data length');
      return null;
    }

    // Parse according to spec: TotalSteps (3 bytes LE) + Calories (3 bytes LE) + Distance (3 bytes LE) + ...
    const steps = data[0] | (data[1] << 8) | (data[2] << 16);
    const calories = data[3] | (data[4] << 8) | (data[5] << 16);
    const distance = data[6] | (data[7] << 8) | (data[8] << 16); // meters

    logger.logData('Total Sport Data', { steps, calories, distance });

    return {
      timestamp: Date.now(),
      steps,
      calories,
      distance,
      activeMinutes: 0, // Not in this response
    };
  }

  /**
   * Parse device notify for activity updates (dataType 11 or 18)
   */
  parseActivityNotify(frame: number[]): Partial<ActivityData> | null {
    const notify = this.parseDeviceNotify(frame);
    if (!notify || (notify.dataType !== 11 && notify.dataType !== 18)) {
      return null;
    }

    const payload = notify.payload;
    if (payload.length < 9) {
      return null;
    }

    // Format: TotalSteps (3 bytes LE) + Calories (3 bytes LE) + Distance (3 bytes LE)
    const steps = payload[0] | (payload[1] << 8) | (payload[2] << 16);
    const calories = payload[3] | (payload[4] << 8) | (payload[5] << 16);
    const distance = payload[6] | (payload[7] << 8) | (payload[8] << 16);

    return {
      timestamp: Date.now(),
      steps,
      calories,
      distance,
      activeMinutes: 0,
    };
  }

  /**
   * Helper: Convert BCD to decimal
   */
  private bcdToDecimal(bcd: number): number {
    return ((bcd >> 4) * 10) + (bcd & 0x0F);
  }
}

export const dataParser = new DataParserService();
