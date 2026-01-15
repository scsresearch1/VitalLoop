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
    // Initialize BLE (will request permissions)
    const initBLE = async () => {
      try {
        await simpleBLE.initialize();
        console.log('✅ BLE initialized in SimpleConnectScreen');
      } catch (err: any) {
        console.error('❌ BLE initialization failed:', err);
        Alert.alert(
          'Initialization Error',
          err.message || 'Failed to initialize Bluetooth. Please check permissions.',
          [
            { text: 'OK' },
            {
              text: 'Retry',
              onPress: () => initBLE(),
            },
          ]
        );
      }
    };

    initBLE();

    // FIXED: Use connection callbacks instead of polling
    const handleConnected = (deviceId: string) => {
      console.log('✅ Connection callback received:', deviceId);
      setConnectedDevice(deviceId);
      setIsConnecting(false); // FIXED: Clear connecting state
      onConnected(deviceId);
    };

    const handleDisconnected = () => {
      console.log('❌ Disconnection callback received');
      setConnectedDevice(null);
      setIsConnecting(false);
    };

    simpleBLE.onConnected(handleConnected);
    simpleBLE.onDisconnected(handleDisconnected);

    // FIXED: Also check if already connected on mount
    if (simpleBLE.isConnected()) {
      const deviceId = simpleBLE.getConnectedDeviceId();
      if (deviceId) {
        setConnectedDevice(deviceId);
      }
    }

    return () => {
      simpleBLE.removeConnectionCallbacks();
    };
  }, []);

  const handleScan = async () => {
    setIsScanning(true);
    setDevices([]);

    try {
      // Ensure BLE is initialized (permissions checked)
      if (!simpleBLE.isInitialized) {
        await simpleBLE.initialize();
      }

      console.log('🔍 Starting scan...');
      const found = await simpleBLE.scanForRing();
      console.log(`✅ Scan complete. Found ${found.length} device(s)`);
      
      setDevices(found);
      if (found.length === 0) {
        Alert.alert(
          'No Devices',
          'No Ring devices found. Make sure your ring is nearby, powered on, and Bluetooth is enabled.'
        );
      }
    } catch (error: any) {
      console.error('❌ Scan error:', error);
      Alert.alert(
        'Scan Error',
        error.message || 'Failed to scan for devices. Please check Bluetooth permissions and try again.'
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleConnect = async (device: Device) => {
    // FIXED: Check if already connecting
    if (isConnecting) {
      Alert.alert('Connection in Progress', 'Please wait for the current connection attempt to complete.');
      return;
    }

    setIsConnecting(true);

    try {
      await simpleBLE.connect(device.id);
      // FIXED: Connection will be confirmed via callback, not polling
      // If connection fails, timeout will clear isConnecting state
      // Set a safety timeout to clear UI state if callback doesn't fire
      setTimeout(() => {
        if (isConnecting && !simpleBLE.isConnected()) {
          console.warn('⚠️ Connection timeout - clearing UI state');
          setIsConnecting(false);
        }
      }, 20000); // 20 second safety timeout
    } catch (error: any) {
      console.error('❌ Connection error:', error);
      Alert.alert('Connection Error', error.message || 'Failed to connect. Please try again.');
      setIsConnecting(false); // FIXED: Always clear on error
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
