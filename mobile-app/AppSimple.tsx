/**
 * Simple App - BLE Ring Connection
 * Enable BLE → Scan → Connect → Show Data
 */

import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import SimpleConnectScreen from './src/screens/SimpleConnectScreen';
import SimpleDataScreen from './src/screens/SimpleDataScreen';

export default function App() {
  const [connectedDeviceId, setConnectedDeviceId] = useState<string | null>(null);

  const handleConnected = (deviceId: string) => {
    setConnectedDeviceId(deviceId);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {connectedDeviceId ? (
        <SimpleDataScreen />
      ) : (
        <SimpleConnectScreen onConnected={handleConnected} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
