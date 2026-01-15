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
  Linking,
} from 'react-native';
import { bleManager } from '../services/BLEManager';
import { BLEDevice } from '../types/ble';

interface DeviceScanScreenProps {
  onDeviceConnected: (deviceId: string) => void;
}

export default function DeviceScanScreen({ onDeviceConnected }: DeviceScanScreenProps) {
  const [devices, setDevices] = useState<BLEDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [bluetoothState, setBluetoothState] = useState<string>('unknown');
  const [initError, setInitError] = useState<string | null>(null);
  const [lastDeviceId, setLastDeviceId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    // Intercept console.log to capture diagnostic logs
    const originalLog = console.log;
    const originalError = console.error;
    
    console.log = (...args: any[]) => {
      originalLog(...args);
      const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      if (message.includes('DIAGNOSTIC')) {
        setLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString()}] ${message}`]);
      }
    };
    
    console.error = (...args: any[]) => {
      originalError(...args);
      const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      if (message.includes('DIAGNOSTIC') || message.includes('ERROR')) {
        setLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString()}] ❌ ${message}`]);
      }
    };
    
    initializeBLE();
    checkBluetoothStatePeriodically();
    checkLastDevice();
    return () => {
      console.log = originalLog;
      console.error = originalError;
      bleManager.destroy();
    };
  }, []);

  const checkLastDevice = () => {
    const deviceId = bleManager.getLastConnectedDeviceId();
    setLastDeviceId(deviceId);
  };

  const initializeBLE = async () => {
    try {
      await bleManager.initialize();
      const state = bleManager.getBluetoothState();
      setBluetoothState(state);
      setInitError(null);
      
      // Check for already-paired devices (device might be connected at system level)
      if (state === 'poweredOn') {
        console.log('Checking for already-paired Ring devices...');
        try {
          const pairedDevices = await bleManager.getBondedPeripherals();
          if (pairedDevices.length > 0) {
            console.log(`✅ Found ${pairedDevices.length} Ring device(s) already paired`);
            setDevices(pairedDevices);
            // Auto-connect to first paired device if auto-scan is enabled
            if (pairedDevices[0].id) {
              console.log(`🔗 Attempting to connect to paired device: ${pairedDevices[0].name || pairedDevices[0].id}`);
              // Small delay to let UI update
              setTimeout(async () => {
                try {
                  await bleManager.connect(pairedDevices[0].id!);
                  const connState = bleManager.getConnectionState();
                  if (connState.isConnected) {
                    onDeviceConnected(pairedDevices[0].id!);
                  }
                } catch (err) {
                  console.error('Auto-connect to paired device failed:', err);
                }
              }, 1000);
            }
          }
        } catch (err) {
          console.error('Failed to check paired devices:', err);
        }
      }
      
      // Auto-scan is enabled in App.tsx, but we can also enable it here as backup
      // The scan will start automatically once Bluetooth is on
      console.log('✅ BLE initialized - auto-scan will start when Bluetooth is enabled');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize Bluetooth';
      console.error(error);
      setInitError(errorMessage);
      
      // Check if error is due to Bluetooth being off
      const state = bleManager.getBluetoothState();
      setBluetoothState(state);
      
      if (state === 'poweredOff' || state === 'off') {
        Alert.alert(
          'Bluetooth Required',
          'Bluetooth is turned off. Please enable Bluetooth to automatically scan and connect to your ring.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                Linking.openSettings();
                // After opening settings, the state listener will detect when Bluetooth turns on
                // and automatically start scanning
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', errorMessage);
      }
    }
  };

  // Periodically check Bluetooth state to handle dynamic changes
  const checkBluetoothStatePeriodically = () => {
    const interval = setInterval(async () => {
      try {
        const state = await bleManager.checkBluetoothState();
        const previousState = bluetoothState;
        setBluetoothState(state);
        
        // If Bluetooth just turned on, auto-scan will start automatically
        if ((previousState === 'poweredOff' || previousState === 'off') && state === 'poweredOn') {
          console.log('✅ Bluetooth turned on - auto-scan will start automatically');
        }
      } catch (error) {
        console.error('Failed to check Bluetooth state:', error);
      }
    }, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  };

  const handleScan = async () => {
    // Check Bluetooth state before scanning
    // If state is 'unknown', query native state first (async)
    let currentState = bleManager.getBluetoothState();
    if (currentState === 'unknown') {
      try {
        currentState = await bleManager.checkBluetoothState();
      } catch (error) {
        console.error('Failed to check Bluetooth state:', error);
        // Continue with 'unknown' state - will show appropriate error
      }
    }
    
    if (currentState !== 'poweredOn') {
      Alert.alert(
        'Bluetooth Required',
        `Bluetooth is ${currentState}. Please enable Bluetooth to scan for devices.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => Linking.openSettings(),
          },
        ]
      );
      return;
    }

    setIsScanning(true);
    setDevices([]);

    try {
      // Manual scan: check paired devices, stop auto-scan, longer duration
      const foundDevices = await bleManager.scanForDevices(10000, true, true);
      setDevices(foundDevices);
      
      if (foundDevices.length === 0) {
        Alert.alert(
          'No Devices Found',
          'No Ring devices were found. Make sure your ring is nearby and powered on.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to scan for devices';
      console.error(error);
      
      // Check if error is due to Bluetooth state
      const state = bleManager.getBluetoothState();
      if (state !== 'poweredOn') {
        Alert.alert(
          'Bluetooth Required',
          `Cannot scan: Bluetooth is ${state}. Please enable Bluetooth.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings(),
            },
          ]
        );
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleReconnect = async () => {
    if (!lastDeviceId) {
      Alert.alert('Error', 'No previous device to reconnect to. Please scan and connect to a device first.');
      return;
    }

    setIsReconnecting(true);

    try {
      await bleManager.reconnect();
      
      // Wait a bit for connection to establish
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const state = bleManager.getConnectionState();
      if (state.isConnected) {
        onDeviceConnected(lastDeviceId);
      } else {
        throw new Error('Reconnection failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reconnect to device';
      console.error(error);
      
      // Check if error is due to Bluetooth state
      const state = bleManager.getBluetoothState();
      if (state !== 'poweredOn') {
        Alert.alert(
          'Bluetooth Required',
          `Cannot reconnect: Bluetooth is ${state}. Please enable Bluetooth.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings(),
            },
          ]
        );
      } else {
        Alert.alert('Reconnection Failed', errorMessage);
      }
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleConnect = async (device: BLEDevice) => {
    if (!device.id) return;

    // Check if already connected to this device
    const connState = bleManager.getConnectionState();
    if (connState.isConnected) {
      // Check if connected to this specific device
      const lastDevice = bleManager.getLastConnectedDeviceId();
      if (lastDevice === device.id) {
        Alert.alert('Already Connected', 'You are already connected to this device.');
        onDeviceConnected(device.id);
        return;
      }
    }

    // Check if already connecting
    if (connState.isConnecting) {
      Alert.alert('Connection in Progress', 'Please wait for the current connection attempt to complete.');
      return;
    }

    // Check Bluetooth state before connecting
    // If state is 'unknown', query native state first (async)
    let currentState = bleManager.getBluetoothState();
    if (currentState === 'unknown') {
      try {
        currentState = await bleManager.checkBluetoothState();
      } catch (error) {
        console.error('Failed to check Bluetooth state:', error);
        // Continue with 'unknown' state - will show appropriate error
      }
    }
    
    if (currentState !== 'poweredOn') {
      Alert.alert(
        'Bluetooth Required',
        `Bluetooth is ${currentState}. Please enable Bluetooth to connect to your ring.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => Linking.openSettings(),
          },
        ]
      );
      return;
    }

    setIsConnecting(true);

    try {
      await bleManager.connect(device.id);
      
      // Wait for connection to establish
      let connectionEstablished = false;
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const state = bleManager.getConnectionState();
        if (state.isConnected) {
          connectionEstablished = true;
          break;
        } else if (!state.isConnecting) {
          throw new Error('Connection failed');
        }
      }

      if (!connectionEstablished) {
        throw new Error('Connection timeout - device did not connect');
      }

      // CRITICAL: Wait for notifications to be enabled before showing dashboard
      console.log('⏳ Waiting for notifications to be enabled...');
      try {
        await bleManager.waitForNotifications(10000); // 10 second timeout
        console.log('✅ Notifications enabled - connection fully ready');
        onDeviceConnected(device.id);
      } catch (notifError) {
        console.error('Failed to enable notifications:', notifError);
        // Still show dashboard but log the error
        onDeviceConnected(device.id);
        Alert.alert(
          'Connection Warning',
          'Connected to device but notifications may not be enabled. Some features may not work.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to device';
      console.error('Connection error:', error);
      
      // Don't show error if it's "already connecting" - that's handled above
      if (errorMessage.includes('Already connecting') || errorMessage.includes('already connected')) {
        // Just wait and check state
        await new Promise(resolve => setTimeout(resolve, 2000));
        const state = bleManager.getConnectionState();
        if (state.isConnected) {
          onDeviceConnected(device.id);
          return;
        }
      }
      
      // Check if error is due to Bluetooth state
      const state = bleManager.getBluetoothState();
      if (state !== 'poweredOn') {
        Alert.alert(
          'Bluetooth Required',
          `Cannot connect: Bluetooth is ${state}. Please enable Bluetooth.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings(),
            },
          ]
        );
      } else {
        Alert.alert('Connection Error', errorMessage);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const renderDevice = ({ item }: { item: BLEDevice }) => (
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

  const isBluetoothOn = bluetoothState === 'poweredOn';
  const isBluetoothOff = bluetoothState === 'poweredOff';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connect to Ring</Text>
      <Text style={styles.subtitle}>Scan for nearby Ring devices</Text>

      {/* Bluetooth State Indicator */}
      {isBluetoothOff && (
        <View style={styles.bluetoothWarning}>
          <Text style={styles.bluetoothWarningText}>
            ⚠️ Bluetooth is OFF
          </Text>
          <Text style={styles.bluetoothWarningSubtext}>
            Enable Bluetooth to automatically scan and connect to your ring
          </Text>
          <Text style={styles.autoConnectHint}>
            Once enabled, the app will automatically find and connect to your ring
          </Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => Linking.openSettings()}
          >
            <Text style={styles.settingsButtonText}>Open Settings</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Auto-scan Status */}
      {isBluetoothOn && !isScanning && devices.length === 0 && (
        <View style={styles.autoScanStatus}>
          <Text style={styles.autoScanText}>
            🔍 Automatically scanning for Ring device...
          </Text>
          <Text style={styles.autoScanSubtext}>
            The app will connect automatically when found
          </Text>
        </View>
      )}

      {initError && !isBluetoothOff && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{initError}</Text>
        </View>
      )}

      {/* Reconnect Button - Show if last device exists and not currently connected */}
      {lastDeviceId && !isScanning && (
        <TouchableOpacity
          style={[
            styles.reconnectButton,
            (isReconnecting || isBluetoothOff) && styles.reconnectButtonDisabled
          ]}
          onPress={handleReconnect}
          disabled={isReconnecting || isBluetoothOff}
        >
          {isReconnecting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.reconnectButtonText}>
              Reconnect to Last Device
            </Text>
          )}
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[
          styles.scanButton,
          (isScanning || isBluetoothOff) && styles.scanButtonDisabled
        ]}
        onPress={handleScan}
        disabled={isScanning || isBluetoothOff}
      >
        {isScanning ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.scanButtonText}>
            {isBluetoothOff ? 'Bluetooth Required' : 'Scan for Devices'}
          </Text>
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
  bluetoothWarning: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  bluetoothWarningText: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  bluetoothWarningSubtext: {
    color: '#888',
    fontSize: 14,
    marginBottom: 12,
  },
  settingsButton: {
    backgroundColor: '#8b5cf6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  settingsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
  },
  reconnectButton: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  reconnectButtonDisabled: {
    opacity: 0.6,
  },
  reconnectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  autoConnectHint: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  autoScanStatus: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  autoScanText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  autoScanSubtext: {
    color: '#888',
    fontSize: 14,
  },
});
