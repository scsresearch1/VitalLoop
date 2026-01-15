/**
 * Simple Connect Screen
 * Scan and connect to Ring
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { simpleBLE } from '../services/SimpleBLE';

interface Device {
  id: string;
  name?: string;
  rssi?: number;
}

interface Props {
  onConnected: (deviceId: string) => void;
}

export default function SimpleConnectScreen({ onConnected }: Props) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<string | null>(null);

  useEffect(() => {
    simpleBLE.initialize().catch(err => {
      Alert.alert('Error', err.message);
    });

    // Check if already connected
    const checkConnected = setInterval(() => {
      if (simpleBLE.isConnected()) {
        const deviceId = simpleBLE.getConnectedDeviceId();
        if (deviceId && deviceId !== connectedDevice) {
          setConnectedDevice(deviceId);
          onConnected(deviceId);
        }
      }
    }, 1000);

    return () => {
      clearInterval(checkConnected);
      simpleBLE.cleanup();
    };
  }, []);

  const handleScan = async () => {
    setIsScanning(true);
    setDevices([]);

    try {
      const found = await simpleBLE.scanForRing();
      setDevices(found);
      if (found.length === 0) {
        Alert.alert('No Devices', 'No Ring devices found. Make sure your ring is nearby and powered on.');
      }
    } catch (error: any) {
      Alert.alert('Scan Error', error.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleConnect = async (device: Device) => {
    setIsConnecting(true);

    try {
      await simpleBLE.connect(device.id);
      // Connection will be confirmed via listener, checkConnected interval will catch it
    } catch (error: any) {
      Alert.alert('Connection Error', error.message);
      setIsConnecting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connect to Ring</Text>

      {connectedDevice && (
        <View style={styles.connectedBanner}>
          <Text style={styles.connectedText}>✅ Connected to {connectedDevice}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, (isScanning || isConnecting) && styles.buttonDisabled]}
        onPress={handleScan}
        disabled={isScanning || isConnecting}
      >
        {isScanning ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Scan for Ring</Text>
        )}
      </TouchableOpacity>

      <FlatList
        data={devices}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.deviceItem}
            onPress={() => handleConnect(item)}
            disabled={isConnecting}
          >
            <View>
              <Text style={styles.deviceName}>{item.name || 'Unknown'}</Text>
              <Text style={styles.deviceId}>{item.id}</Text>
            </View>
            {isConnecting && <ActivityIndicator size="small" color="#8b5cf6" />}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {isScanning ? 'Scanning...' : 'No devices found. Tap "Scan for Ring" to start.'}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  connectedBanner: {
    backgroundColor: '#10b981',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  connectedText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#8b5cf6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deviceItem: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  deviceId: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
});
