/**
 * Simple Data Screen
 * Show all data received from Ring
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { simpleBLE } from '../services/SimpleBLE';
import { dataParser } from '../services/DataParser';
import { extractOpcode } from '../utils/crc';
import { Opcode } from '../types/ble';

export default function SimpleDataScreen() {
  const [receivedData, setReceivedData] = useState<Array<{ 
    time: string; 
    data: number[]; 
    hex: string;
    opcode?: number;
    metrics?: { heartRate?: number; spo2?: number; temperature?: number; quality?: number };
  }>>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    console.log('📱 SimpleDataScreen: Setting up data listener');
    
    // Check connection status
    const checkInterval = setInterval(() => {
      if (simpleBLE.isConnected()) {
        const id = simpleBLE.getConnectedDeviceId();
        if (id !== deviceId) {
          console.log('📱 SimpleDataScreen: Device connected:', id);
          setDeviceId(id);
        }
      } else {
        if (deviceId) {
          console.log('📱 SimpleDataScreen: Device disconnected');
          setDeviceId(null);
          setReceivedData([]);
        }
      }
    }, 1000);

    // CRITICAL: Set up data listener immediately, even before connection
    // This ensures callback is ready when notifications are enabled
    console.log('📱 SimpleDataScreen: Registering onData callback');
    simpleBLE.onData((data: number[]) => {
      console.log('📱 SimpleDataScreen: Data received! Length:', data.length);
      
      // Extract opcode
      const opcode = extractOpcode(data);
      const hex = data.map(b => b.toString(16).padStart(2, '0')).join(' ');
      
      // Try to parse metrics from the data
      let metrics: { heartRate?: number; spo2?: number; temperature?: number; quality?: number } | undefined;
      
      if (opcode === Opcode.REAL_TIME_HEART_RATE) {
        // Parse all metrics from opcode 0x1E
        const parsedMetrics = dataParser.parseRealTimeMetrics(data);
        if (parsedMetrics) {
          metrics = {
            heartRate: parsedMetrics.heartRate,
            spo2: parsedMetrics.spo2,
            temperature: parsedMetrics.temperature,
            quality: parsedMetrics.quality,
          };
          console.log('📊 Metrics extracted:', metrics);
        }
      } else if (opcode === Opcode.DEVICE_NOTIFY) {
        // Parse metrics from device notify (opcode 0x73)
        const notify = dataParser.parseDeviceNotify(data);
        if (notify?.metrics) {
          metrics = {
            heartRate: notify.metrics.heartRate,
            spo2: notify.metrics.spo2,
            temperature: notify.metrics.temperature,
            quality: notify.metrics.quality,
          };
          console.log('📊 Device Notify metrics:', metrics);
        }
      }
      
      setReceivedData(prev => {
        const newData = [
          { 
            time: new Date().toLocaleTimeString(), 
            data, 
            hex,
            opcode,
            metrics,
          },
          ...prev.slice(0, 99) // Keep last 100
        ];
        console.log('📱 SimpleDataScreen: Total packets:', newData.length);
        return newData;
      });
    });
    console.log('📱 SimpleDataScreen: onData callback registered');

    return () => {
      clearInterval(checkInterval);
      console.log('📱 SimpleDataScreen: Cleanup - removing listeners');
    };
  }, [deviceId]);

  if (!deviceId) {
    return (
      <View style={styles.container}>
        <Text style={styles.notConnected}>Not Connected</Text>
        <Text style={styles.notConnectedSub}>Connect to a Ring device to see data</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ring Data</Text>
        <Text style={styles.deviceId}>Device: {deviceId}</Text>
        <Text style={styles.count}>Received: {receivedData.length} packets</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {receivedData.length === 0 ? (
          <Text style={styles.emptyText}>Waiting for data...</Text>
        ) : (
          receivedData.map((item, idx) => (
            <View key={idx} style={styles.dataItem}>
              <Text style={styles.time}>{item.time}</Text>
              {item.opcode !== undefined && (
                <Text style={styles.opcode}>
                  Opcode: 0x{item.opcode.toString(16).padStart(2, '0').toUpperCase()}
                </Text>
              )}
              {item.metrics && (
                <View style={styles.metricsContainer}>
                  {item.metrics.heartRate !== undefined && (
                    <Text style={styles.metric}>❤️ HR: {item.metrics.heartRate} bpm</Text>
                  )}
                  {item.metrics.spo2 !== undefined && (
                    <Text style={styles.metric}>🫁 SPO2: {item.metrics.spo2}%</Text>
                  )}
                  {item.metrics.temperature !== undefined && (
                    <Text style={styles.metric}>🌡️ Temp: {item.metrics.temperature.toFixed(1)}°C</Text>
                  )}
                  {item.metrics.quality !== undefined && (
                    <Text style={styles.metric}>📶 Quality: {item.metrics.quality}%</Text>
                  )}
                </View>
              )}
              <Text style={styles.hex}>{item.hex}</Text>
              <Text style={styles.decimal}>
                [{item.data.map(b => b.toString().padStart(3)).join(', ')}]
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  notConnected: {
    color: '#888',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
  notConnectedSub: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  deviceId: {
    color: '#8b5cf6',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  count: {
    color: '#888',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  dataItem: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    margin: 8,
    marginHorizontal: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#8b5cf6',
  },
  time: {
    color: '#8b5cf6',
    fontSize: 10,
    marginBottom: 4,
  },
  hex: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  decimal: {
    color: '#888',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  opcode: {
    color: '#8b5cf6',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  metricsContainer: {
    backgroundColor: '#0a0a0a',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
    marginTop: 4,
  },
  metric: {
    color: '#10b981',
    fontSize: 12,
    marginBottom: 2,
    fontFamily: 'monospace',
  },
});
