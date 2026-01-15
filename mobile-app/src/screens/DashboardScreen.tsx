/**
 * Dashboard Screen - Gen-Z Styled
 * Displays real-time data from the Ring with cinematic UI
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  FadeInDown, 
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Heart, Activity, Moon, TrendingUp } from 'lucide-react-native';
import { bleManager } from '../services/BLEManager';
import { dataParser } from '../services/DataParser';
import { ringDataService } from '../services/RingDataService';
import { Opcode } from '../types/ble';
import { RingData, HeartRateData } from '../models/RingData';
import DailyFocusHero from '../components/DailyFocusHero';
import MetricCard from '../components/styled/MetricCard';
import CinematicCard from '../components/styled/CinematicCard';
import GlassCard from '../components/styled/GlassCard';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 cards per row with padding

export default function DashboardScreen() {
  const [ringData, setRingData] = useState<Partial<RingData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    checkConnection();
    if (isConnected) {
      loadInitialData();
      startHeartRateMonitoring();
    }
    return () => {
      stopHeartRateMonitoring();
    };
  }, [isConnected]);

  const checkConnection = () => {
    const state = bleManager.getConnectionState();
    setIsConnected(state.isConnected);
    setIsLoading(false);
  };

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const data = await ringDataService.fetchAllData();
      setRingData(prev => ({
        ...prev,
        ...data,
      }));
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startHeartRateMonitoring = async () => {
    if (!isConnected) return;

    try {
      await bleManager.sendCommand(Opcode.START_HEART_RATE);
      bleManager.onNotification(Opcode.REAL_TIME_HEART_RATE, (data) => {
        const hrData = dataParser.parseRealTimeHeartRate(data);
        if (hrData) {
          setRingData(prev => ({
            ...prev,
            currentHeartRate: hrData,
            heartRateHistory: [...(prev.heartRateHistory || []), hrData].slice(-100),
          }));
        }
      });
    } catch (error) {
      console.error('Failed to start heart rate monitoring:', error);
    }
  };

  const stopHeartRateMonitoring = async () => {
    if (!isConnected) return;
    try {
      await bleManager.sendCommand(Opcode.STOP_HEART_RATE);
    } catch (error) {
      console.error('Failed to stop heart rate monitoring:', error);
    }
  };

  // Determine which metrics need attention
  const needsAttention = (value: number, threshold: number, isHigherBetter = true) => {
    return isHigherBetter ? value < threshold : value > threshold;
  };

  // Calculate metrics from real data
  const currentHR = ringData.currentHeartRate?.heartRate || 
    (ringData.heartRateHistory && ringData.heartRateHistory.length > 0 
      ? ringData.heartRateHistory[ringData.heartRateHistory.length - 1].heartRate 
      : 72);
  
  // Get steps from activity data
  const activityData = ringData.activity && ringData.activity.length > 0 
    ? ringData.activity[ringData.activity.length - 1] 
    : null;
  const steps = activityData?.steps || 0;
  
  // Calculate sleep hours from most recent sleep data
  const latestSleep = ringData.sleepData && ringData.sleepData.length > 0
    ? ringData.sleepData[ringData.sleepData.length - 1]
    : null;
  const sleepHours = latestSleep ? latestSleep.totalDuration / 60 : 0; // Convert minutes to hours
  
  // Calculate recovery from HRV (simplified: higher HRV = better recovery)
  const latestHRV = ringData.hrvData && ringData.hrvData.length > 0
    ? ringData.hrvData[ringData.hrvData.length - 1]
    : null;
  const recovery = latestHRV 
    ? Math.min(100, Math.max(0, Math.round((latestHRV.rmssd / 50) * 100))) // Normalize RMSSD to 0-100
    : 85; // Default if no HRV data

  const metrics = [
    {
      icon: <Heart size={24} color={colors.pink[400]} />,
      label: 'Heart Rate',
      value: currentHR,
      unit: 'bpm',
      trend: '+2',
      backgroundImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&q=80',
      glowColor: 'pink' as const,
      needsAttention: needsAttention(currentHR, 60, false) || currentHR > 100,
    },
    {
      icon: <Activity size={24} color={colors.cyan[400]} />,
      label: 'Steps',
      value: steps.toLocaleString(),
      unit: '',
      trend: '+1.2k',
      backgroundImage: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
      glowColor: 'cyan' as const,
      needsAttention: needsAttention(steps, 5000),
    },
    {
      icon: <Moon size={24} color={colors.purple[400]} />,
      label: 'Sleep',
      value: sleepHours.toFixed(1),
      unit: 'hrs',
      trend: '+0.5',
      backgroundImage: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=400&q=80',
      glowColor: 'purple' as const,
      needsAttention: needsAttention(sleepHours, 7),
    },
    {
      icon: <TrendingUp size={24} color={colors.orange[400]} />,
      label: 'Recovery',
      value: recovery,
      unit: '%',
      trend: '+5',
      backgroundImage: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80',
      glowColor: 'orange' as const,
      needsAttention: needsAttention(recovery, 80),
    },
  ];

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.purple[500]} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!isConnected) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Not Connected</Text>
        <Text style={styles.errorSubtext}>Please connect to a Ring device</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Daily Focus Hero */}
      <DailyFocusHero userName="John" />

      {/* Metrics Grid */}
      <View style={styles.metricsGrid}>
        {metrics.map((metric, index) => (
          <Animated.View
            key={index}
            entering={FadeInUp.delay(index * 100).duration(600)}
            style={styles.metricWrapper}
          >
            <MetricCard {...metric} style={{ width: CARD_WIDTH }} />
          </Animated.View>
        ))}
      </View>

      {/* Heart Rate Card */}
      {ringData.currentHeartRate && (
        <Animated.View entering={FadeInDown.delay(400).duration(600)}>
          <CinematicCard
            backgroundImage="https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800&q=80"
            overlayOpacity={0.6}
            style={styles.heartRateCard}
          >
            <View style={styles.heartRateContent}>
              <Text style={styles.heartRateLabel}>Current Heart Rate</Text>
              <View style={styles.heartRateRow}>
                <Text style={styles.heartRateValue}>
                  {ringData.currentHeartRate.heartRate}
                </Text>
                <Text style={styles.heartRateUnit}>bpm</Text>
              </View>
              {ringData.currentHeartRate.quality && (
                <Text style={styles.qualityText}>
                  Quality: {ringData.currentHeartRate.quality}%
                </Text>
              )}
            </View>
          </CinematicCard>
        </Animated.View>
      )}

      {/* Device Status Card */}
      <Animated.View entering={FadeInDown.delay(500).duration(600)}>
        <GlassCard variant="medium" style={styles.deviceCard}>
          <Text style={styles.cardTitle}>Device Status</Text>
          {ringData.deviceInfo?.batteryLevel !== undefined && (
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Battery:</Text>
              <Text style={styles.statusValue}>
                {ringData.deviceInfo.batteryLevel}%
              </Text>
            </View>
          )}
          {ringData.deviceInfo?.firmwareVersion && (
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Firmware:</Text>
              <Text style={styles.statusValue}>
                {ringData.deviceInfo.firmwareVersion}
              </Text>
            </View>
          )}
        </GlassCard>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  contentContainer: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 100,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.slate[400],
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    color: colors.pink[500],
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorSubtext: {
    color: colors.slate[400],
    fontSize: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 16,
  },
  metricWrapper: {
    marginBottom: 16,
  },
  heartRateCard: {
    marginBottom: 20,
    minHeight: 180,
  },
  heartRateContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  heartRateLabel: {
    fontSize: 14,
    color: colors.slate[400],
    marginBottom: 12,
    fontWeight: '500',
  },
  heartRateRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  heartRateValue: {
    fontSize: 72,
    fontWeight: '700',
    color: colors.white,
  },
  heartRateUnit: {
    fontSize: 24,
    color: colors.slate[400],
    marginLeft: 8,
    fontWeight: '600',
  },
  qualityText: {
    fontSize: 12,
    color: colors.cyan[400],
    fontWeight: '500',
  },
  deviceCard: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
    color: colors.slate[400],
  },
  statusValue: {
    fontSize: 14,
    color: colors.white,
    fontWeight: '600',
  },
});
