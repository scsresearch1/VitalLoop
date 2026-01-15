/**
 * Metrics Screen - Gen-Z Styled
 * Charts and historical data visualization
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { TrendingUp, Moon, Calendar } from 'lucide-react-native';
import CinematicCard from '../components/styled/CinematicCard';
import GlassCard from '../components/styled/GlassCard';
import { colors } from '../theme/colors';
import { ringDataService } from '../services/RingDataService';
import { RingData } from '../models/RingData';

const { width } = Dimensions.get('window');

export default function MetricsScreen() {
  const [ringData, setRingData] = useState<Partial<RingData>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load stored data first
    loadStoredData();
    // Then try to fetch fresh data if connected
    loadData();
  }, []);

  /**
   * Load stored data from local storage
   */
  const loadStoredData = async () => {
    try {
      const storedData = await ringDataService.loadStoredData();
      setRingData(storedData);
      console.log('✅ Loaded stored metrics data from local storage');
    } catch (error) {
      console.error('Failed to load stored metrics data:', error);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await ringDataService.fetchAllData();
      setRingData(data);
    } catch (error) {
      console.error('Failed to load metrics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Prepare heart rate chart data from history
  const hrHistory = ringData.heartRateHistory || [];
  const hrDataPoints = hrHistory.slice(-6).map(hr => hr.heartRate);
  const hrLabels = hrHistory.slice(-6).map((hr, idx) => {
    const date = new Date(hr.timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
  });
  
  const hrData = {
    labels: hrLabels.length > 0 ? hrLabels : ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM'],
    datasets: [{
      data: hrDataPoints.length > 0 ? hrDataPoints : [65, 72, 75, 78, 72, 68],
      color: (opacity = 1) => `rgba(236, 72, 153, ${opacity})`,
      strokeWidth: 3,
    }],
  };

  // Prepare sleep quality chart data
  const sleepHistory = ringData.sleepData || [];
  const sleepQuality = sleepHistory.slice(-7).map(sleep => sleep.quality);
  const sleepLabels = sleepHistory.slice(-7).map(sleep => {
    const date = new Date(sleep.date);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  });

  const sleepData = {
    labels: sleepLabels.length > 0 ? sleepLabels : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      data: sleepQuality.length > 0 ? sleepQuality : [85, 90, 75, 88, 92, 80, 87],
      color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
      strokeWidth: 3,
    }],
  };

  // Get activity summary from real data
  const activityData = ringData.activity && ringData.activity.length > 0 
    ? ringData.activity[ringData.activity.length - 1] 
    : null;

  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: 'transparent',
    backgroundGradientTo: 'transparent',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity * 0.6})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: colors.pink[400],
    },
    propsForBackgroundLines: {
      strokeDasharray: '3,3',
      stroke: 'rgba(255, 255, 255, 0.05)',
    },
  };

  const activitySummary = [
    { 
      label: 'Steps', 
      value: activityData?.steps ? activityData.steps.toLocaleString() : '0', 
      color: colors.cyan[400] 
    },
    { 
      label: 'Calories', 
      value: activityData?.calories ? activityData.calories.toLocaleString() : '0', 
      color: colors.pink[400] 
    },
    { 
      label: 'km', 
      value: activityData?.distance ? (activityData.distance / 1000).toFixed(1) : '0.0', 
      color: colors.orange[400] 
    },
  ];

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.purple[500]} />
        <Text style={styles.loadingText}>Loading metrics...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Header */}
      <Animated.View entering={FadeInDown.duration(800)}>
        <CinematicCard
          backgroundImage="https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=1200&q=80"
          overlayOpacity={0.6}
          style={styles.hero}
        >
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Your Metrics</Text>
            <Text style={styles.heroSubtitle}>
              Deep dive into your <Text style={styles.highlight}>health data</Text>
            </Text>
          </View>
        </CinematicCard>
      </Animated.View>

      {/* Heart Rate Chart */}
      <Animated.View entering={FadeInUp.delay(200).duration(600)}>
        <CinematicCard
          backgroundImage="https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=1200&q=80"
          overlayOpacity={0.7}
          style={styles.chartCard}
        >
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>Heart Rate</Text>
              <Text style={styles.chartSubtitle}>Last 24 hours</Text>
            </View>
            <View style={styles.trendBadge}>
              <TrendingUp size={16} color={colors.green[400]} />
              <Text style={styles.trendText}>+5%</Text>
            </View>
          </View>
          <LineChart
            data={hrData}
            width={width - 64}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </CinematicCard>
      </Animated.View>

      {/* Sleep Quality Chart */}
      <Animated.View entering={FadeInUp.delay(300).duration(600)}>
        <CinematicCard
          backgroundImage="https://images.unsplash.com/photo-1522771739844-6a9f47d43b8d?w=1200&q=80"
          overlayOpacity={0.7}
          style={styles.chartCard}
        >
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>Sleep Quality</Text>
              <Text style={styles.chartSubtitle}>Last 7 days</Text>
            </View>
            <View style={styles.trendBadge}>
              <Moon size={16} color={colors.purple[400]} />
              <Text style={styles.trendText}>7.5hrs</Text>
            </View>
          </View>
          <LineChart
            data={sleepData}
            width={width - 64}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </CinematicCard>
      </Animated.View>

      {/* Activity Summary */}
      <Animated.View entering={FadeInUp.delay(400).duration(600)}>
        <View style={styles.activityContainer}>
          <Text style={styles.sectionTitle}>Activity Summary</Text>
          <View style={styles.activityGrid}>
            {activitySummary.map((item, index) => (
              <GlassCard key={index} variant="medium" style={styles.activityCard}>
                <Text style={[styles.activityValue, { color: item.color }]}>
                  {item.value}
                </Text>
                <Text style={styles.activityLabel}>{item.label}</Text>
              </GlassCard>
            ))}
          </View>
        </View>
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
  hero: {
    height: 180,
    marginBottom: 20,
  },
  heroContent: {
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  heroTitle: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 18,
    color: colors.white,
    opacity: 0.8,
  },
  highlight: {
    color: colors.cyan[400],
    fontWeight: '700',
  },
  chartCard: {
    marginBottom: 20,
    padding: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 16,
    color: colors.white,
    opacity: 0.7,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.green[500] + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.green[400] + '30',
  },
  trendText: {
    color: colors.green[400],
    fontWeight: '700',
    fontSize: 14,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  activityContainer: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 16,
  },
  activityGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  activityCard: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  activityValue: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  activityLabel: {
    fontSize: 12,
    color: colors.slate[400],
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
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
});
