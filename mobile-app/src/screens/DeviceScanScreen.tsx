/**
 * Device Scan Screen
 * Scans for and connects to Ring devices
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Device } from 'react-native-ble-manager';
import { bleManager } from '../services/BLEManager';

interface DeviceScanScreenProps {
  onDeviceConnected: (deviceId: string) => void;
}

export default function DeviceScanScreen({ onDeviceConnected }: DeviceScanScreenProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    initializeBLE();
    return () => {
      bleManager.destroy();
    };
  }, []);

  const initializeBLE = async () => {
    try {
      await bleManager.initialize();
    } catch (error) {
      Alert.alert('Error', 'Failed to initialize Bluetooth');
      console.error(error);
    }
  };

  const handleScan = async () => {
    setIsScanning(true);
    setDevices([]);

    try {
      const foundDevices = await bleManager.scanForDevices(5000);
      setDevices(foundDevices);
    } catch (error) {
      Alert.alert('Error', 'Failed to scan for devices');
      console.error(error);
    } finally {
      setIsScanning(false);
    }
  };

  const handleConnect = async (device: Device) => {
    if (!device.id) return;

    setIsConnecting(true);

    try {
      await bleManager.connect(device.id);
      
      // Wait a bit for connection to establish
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const state = bleManager.getConnectionState();
      if (state.isConnected) {
        onDeviceConnected(device.id);
      } else {
        throw new Error('Connection failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to device');
      console.error(error);
    } finally {
      setIsConnecting(false);
    }
  };

  const renderDevice = ({ item }: { item: Device }) => (
    <TouchableOpacity
      style={styles.deviceItem}
      onPress={() => handleConnect(item)}
      disabled={isConnecting}
    >
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name || 'Unknown Device'}</Text>
        <Text style={styles.deviceId}>{item.id}</Text>
        {item.rssi && <Text style={styles.deviceRssi}>RSSI: {item.rssi} dBm</Text>}
      </View>
      {isConnecting && <ActivityIndicator size="small" color="#8b5cf6" />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connect to Ring</Text>
      <Text style={styles.subtitle}>Scan for nearby Ring devices</Text>

      <TouchableOpacity
        style={[styles.scanButton, isScanning && styles.scanButtonDisabled]}
        onPress={handleScan}
        disabled={isScanning}
      >
        {isScanning ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.scanButtonText}>Scan for Devices</Text>
        )}
      </TouchableOpacity>

      <FlatList
        data={devices}
        renderItem={renderDevice}
        keyExtractor={(item) => item.id || Math.random().toString()}
        style={styles.deviceList}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {isScanning ? 'Scanning...' : 'No devices found. Tap "Scan for Devices" to start.'}
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
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 24,
  },
  scanButton: {
    backgroundColor: '#8b5cf6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  scanButtonDisabled: {
    opacity: 0.6,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deviceList: {
    flex: 1,
  },
  deviceItem: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deviceInfo: {
    flex: 1,
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
    marginBottom: 2,
  },
  deviceRssi: {
    color: '#666',
    fontSize: 12,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
});
