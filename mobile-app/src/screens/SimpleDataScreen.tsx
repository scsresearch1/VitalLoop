/**
 * Simple Data Screen
 * Show all data received from Ring
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { simpleBLE } from '../services/SimpleBLE';

export default function SimpleDataScreen() {
  const [receivedData, setReceivedData] = useState<Array<{ time: string; data: number[]; hex: string }>>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    // Check connection status
    const checkInterval = setInterval(() => {
      if (simpleBLE.isConnected()) {
        const id = simpleBLE.getConnectedDeviceId();
        if (id !== deviceId) {
          setDeviceId(id);
        }
      } else {
        if (deviceId) {
          setDeviceId(null);
          setReceivedData([]);
        }
      }
    }, 1000);

    // Listen for data
    simpleBLE.onData((data: number[]) => {
      const hex = data.map(b => b.toString(16).padStart(2, '0')).join(' ');
      setReceivedData(prev => [
        { time: new Date().toLocaleTimeString(), data, hex },
        ...prev.slice(0, 99) // Keep last 100
      ]);
    });

    return () => {
      clearInterval(checkInterval);
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
});
