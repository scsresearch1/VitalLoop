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

  // Monitor connection state and update UI when device connects/disconnects
  // This catches auto-connect events that happen without manual user interaction
  useEffect(() => {
    if (!isInitialized) return;

    const checkConnectionState = () => {
      const state = bleManager.getConnectionState();
      const currentDeviceId = bleManager.getConnectedDeviceId();
      
      // If connected but App state doesn't know about it, update it
      if (state.isConnected && currentDeviceId && currentDeviceId !== connectedDeviceId) {
        console.log('✅ Device connected detected (auto-connect), updating UI:', currentDeviceId);
        setConnectedDeviceId(currentDeviceId);
      }
      
      // If disconnected but App state thinks it's connected, clear it
      if (!state.isConnected && connectedDeviceId) {
        console.log('❌ Device disconnected detected, clearing UI');
        setConnectedDeviceId(null);
      }
    };

    // Check immediately
    checkConnectionState();

    // Check frequently (every 500ms) to catch auto-connect events quickly
    const interval = setInterval(async () => {
      const state = bleManager.getConnectionState();
      const currentDeviceId = bleManager.getConnectedDeviceId();
      
      // If connected but App state doesn't know about it, wait for notifications then update
      if (state.isConnected && currentDeviceId && currentDeviceId !== connectedDeviceId) {
        console.log('✅ Device connected detected (auto-connect), waiting for notifications...');
        try {
          // Wait for notifications to be enabled before showing dashboard
          await bleManager.waitForNotifications(10000);
          console.log('✅ Notifications enabled - updating UI');
          setConnectedDeviceId(currentDeviceId);
        } catch (error) {
          console.error('Failed to wait for notifications:', error);
          // Still update UI but log the error
          setConnectedDeviceId(currentDeviceId);
        }
      }
      
      // If disconnected but App state thinks it's connected, clear it
      if (!state.isConnected && connectedDeviceId) {
        console.log('❌ Device disconnected detected, clearing UI');
        setConnectedDeviceId(null);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isInitialized, connectedDeviceId]);

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
      
      // Mark as initialized FIRST so UI can render
      setIsInitialized(true);
      setInitError(null);
      
      // Now initialize BLE Manager in background (non-blocking)
      // This allows the app UI to show immediately
      bleManager.initialize().then(() => {
        // Check if already connected to a device (e.g., from previous session)
        const connectionState = bleManager.getConnectionState();
        const connectedDevice = bleManager.getConnectedDeviceId();
        if (connectionState.isConnected && connectedDevice) {
          console.log('✅ Device already connected on startup:', connectedDevice);
          // Wait for notifications before updating UI
          bleManager.waitForNotifications(10000).then(() => {
            setConnectedDeviceId(connectedDevice);
          }).catch(() => {
            // Still update UI even if notifications timeout
            setConnectedDeviceId(connectedDevice);
          });
        }
        
        // Enable automatic scanning and connection AFTER UI is ready
        // Small delay to ensure UI has rendered
        setTimeout(() => {
          console.log('🔄 Enabling automatic scan and connect...');
          bleManager.enableAutoScanAndConnect();
          console.log('✅ Auto-scan enabled - will automatically find and connect to Ring');
        }, 500); // 500ms delay to let UI render first
      }).catch((error) => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Failed to initialize BLE Manager:', error);
        setInitError(errorMessage);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed foundation checks:', error);
      
      // Check if error is "BLE native module not available"
      if (errorMessage.includes('BLE native module not available')) {
        console.error('❌ CRITICAL: BLE native module not available error');
        console.error('→ This means the APK does not contain the native module');
        console.error('→ Rebuild required: npx expo run:android or eas build');
      }
      
      // Show UI first, then show error
      setIsInitialized(true);
      setInitError(errorMessage);
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
