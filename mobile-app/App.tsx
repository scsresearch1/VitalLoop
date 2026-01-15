/**
 * Main App Component
 * VitalLoop - Smart Ring Health App
 */

import 'react-native-reanimated';
import React, { useState, useEffect, ErrorInfo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import DeviceScanScreen from './src/screens/DeviceScanScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import WorkoutSelectionScreen from './src/screens/WorkoutSelectionScreen';
import MetricsScreen from './src/screens/MetricsScreen';
import InsightsScreen from './src/screens/InsightsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import BottomNav from './src/components/BottomNav';
import { bleManager } from './src/services/BLEManager';
import { colors } from './src/theme/colors';

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null; errorInfo: ErrorInfo | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App Error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <ScrollView style={styles.errorScroll}>
            <Text style={styles.errorText}>
              {this.state.error?.toString()}
            </Text>
            {this.state.errorInfo && (
              <Text style={styles.errorStack}>
                {this.state.errorInfo.componentStack}
              </Text>
            )}
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [connectedDeviceId, setConnectedDeviceId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    initializeApp();
    return () => {
      bleManager.disconnect();
    };
  }, []);

  const initializeApp = async () => {
    try {
      // CRITICAL FOUNDATION CHECKS - All must pass
      const { NativeModules, Platform } = require('react-native');
      const BleManagerModule = require('react-native-ble-manager');
      
      const checks = {
        '1. NativeModules.BleManager non-null': 
          NativeModules.BleManager !== null && NativeModules.BleManager !== undefined,
        
        '2. Not Expo Go': 
          !NativeModules.ExponentConstants && Platform.OS === 'android',
        
        '3. Not Web build': 
          Platform.OS === 'android',
        
        '4. BleManager module available': 
          BleManagerModule !== null && BleManagerModule !== undefined,
      };

      console.log('=== CRITICAL FOUNDATION CHECKS ===');
      let allPass = true;
      Object.entries(checks).forEach(([check, result]) => {
        const status = result ? '✅ YES' : '❌ NO';
        console.log(`${status} - ${check}`);
        if (!result) allPass = false;
      });

      if (!allPass) {
        const errorMsg = 'CRITICAL: Foundation checks failed. Native module not available. Rebuild required.';
        console.error('❌ FOUNDATION CHECKS FAILED - REJECT IMMEDIATELY');
        console.error('→ Do NOT proceed with scanning, GATT, or data parsing');
        console.error('→ Fix build/configuration issues first');
        setInitError(errorMsg);
        setIsInitialized(true);
        return;
      }

      console.log('✅ ALL FOUNDATION CHECKS PASSED');
      console.log('→ Native module verified, proceeding with initialization');
      console.log('===================================');
      
      // Now safe to initialize BLE Manager
      await bleManager.initialize();
      setIsInitialized(true);
      setInitError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to initialize app:', error);
      
      // Check if error is "BLE native module not available"
      if (errorMessage.includes('BLE native module not available')) {
        console.error('❌ CRITICAL: BLE native module not available error');
        console.error('→ This means the APK does not contain the native module');
        console.error('→ Rebuild required: npx expo run:android or eas build');
      }
      
      setInitError(errorMessage);
      // Still set initialized to true so app can show error UI
      setIsInitialized(true);
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
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Initializing...</Text>
        </View>
      </View>
    );
  }

  const handleRetryPermissions = async () => {
    setInitError(null);
    setIsInitialized(false);
    await initializeApp();
  };

  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  if (initError) {
    const isPermissionError = initError.includes('permission') || initError.includes('Permission');
    
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Initialization Error</Text>
          <Text style={styles.errorText}>{initError}</Text>
          <Text style={styles.errorSubtext}>
            The app will still work, but Bluetooth features may be unavailable.
          </Text>
          
          {isPermissionError && (
            <>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={handleRetryPermissions}
              >
                <Text style={styles.retryButtonText}>Retry Permissions</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.settingsButton}
                onPress={handleOpenSettings}
              >
                <Text style={styles.settingsButtonText}>Open Settings</Text>
              </TouchableOpacity>
              
              <Text style={styles.helpText}>
                Grant the following permissions in Settings:
                {'\n'}• Bluetooth
                {'\n'}• Location (required for Bluetooth scanning)
              </Text>
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <View style={styles.container}>
        <StatusBar style="light" />
        {renderScreen()}
        {connectedDeviceId && (
          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        )}
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.white,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    color: colors.pink[500],
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  errorText: {
    color: colors.white,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  errorSubtext: {
    color: colors.slate[400],
    fontSize: 14,
    textAlign: 'center',
  },
  errorScroll: {
    maxHeight: 300,
  },
  errorStack: {
    color: colors.slate[400],
    fontSize: 12,
    fontFamily: 'monospace',
  },
  retryButton: {
    backgroundColor: colors.pink[500],
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  settingsButton: {
    backgroundColor: colors.slate[700],
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  settingsButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    color: colors.slate[400],
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
