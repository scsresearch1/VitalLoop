/**
 * Main App Component
 * VitalLoop - Smart Ring Health App
 */

import 'react-native-reanimated';
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import DeviceScanScreen from './src/screens/DeviceScanScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import WorkoutSelectionScreen from './src/screens/WorkoutSelectionScreen';
import MetricsScreen from './src/screens/MetricsScreen';
import InsightsScreen from './src/screens/InsightsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import BottomNav from './src/components/BottomNav';
import { bleManager } from './src/services/BLEManager';
import { colors } from './src/theme/colors';

export default function App() {
  const [connectedDeviceId, setConnectedDeviceId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    initializeApp();
    return () => {
      bleManager.disconnect();
    };
  }, []);

  const initializeApp = async () => {
    try {
      await bleManager.initialize();
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  };

  const handleDeviceConnected = (deviceId: string) => {
    setConnectedDeviceId(deviceId);
  };

  const handleDisconnect = async () => {
    await bleManager.disconnect();
    setConnectedDeviceId(null);
  };

  const handleStartWorkout = (workout: any) => {
    // TODO: Navigate to active workout screen
    console.log('Starting workout:', workout);
  };

  const renderScreen = () => {
    if (!connectedDeviceId) {
      return <DeviceScanScreen onDeviceConnected={handleDeviceConnected} />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <DashboardScreen />;
      case 'workout':
        return <WorkoutSelectionScreen onStartWorkout={handleStartWorkout} />;
      case 'metrics':
        return <MetricsScreen />;
      case 'insights':
        return <InsightsScreen />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {renderScreen()}
      {connectedDeviceId && (
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
});
