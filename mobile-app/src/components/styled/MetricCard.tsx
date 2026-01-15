/**
 * Metric Card Component
 * Cinematic card with background image and glow effects
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import CinematicCard from './CinematicCard';
import { colors } from '../../theme/colors';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming,
  interpolate 
} from 'react-native-reanimated';
import { useEffect } from 'react';

interface MetricCardProps {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  trend?: string;
  backgroundImage?: string;
  glowColor?: 'purple' | 'pink' | 'cyan' | 'orange';
  needsAttention?: boolean;
  style?: ViewStyle;
}

export default function MetricCard({
  icon,
  label,
  value,
  unit,
  trend,
  backgroundImage,
  glowColor = 'purple',
  needsAttention = false,
  style,
}: MetricCardProps) {
  const glowOpacity = useSharedValue(0.4);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (needsAttention) {
      glowOpacity.value = withRepeat(
        withTiming(0.8, { duration: 2000 }),
        -1,
        true
      );
      scale.value = withRepeat(
        withTiming(1.05, { duration: 2000 }),
        -1,
        true
      );
    }
  }, [needsAttention]);

  const glowStyle = useAnimatedStyle(() => {
    const glow = colors.glow[glowColor];
    return {
      shadowColor: glow,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: glowOpacity.value,
      shadowRadius: 20,
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <Animated.View style={[styles.container, glowStyle, style]}>
      <CinematicCard
        backgroundImage={backgroundImage}
        overlayOpacity={0.6}
        style={styles.card}
      >
        <View style={styles.content}>
          {icon && (
            <View style={styles.iconContainer}>
              {icon}
            </View>
          )}
          <Text style={styles.label}>{label}</Text>
          <View style={styles.valueRow}>
            <Text style={styles.value}>{value}</Text>
            {unit && <Text style={styles.unit}>{unit}</Text>}
          </View>
          {trend && (
            <View style={styles.trendContainer}>
              <Text style={styles.trend}>{trend}</Text>
            </View>
          )}
        </View>
      </CinematicCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  card: {
    minHeight: 140,
  },
  content: {
    padding: 16,
  },
  iconContainer: {
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: colors.slate[400],
    marginBottom: 4,
    fontWeight: '500',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  value: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
  },
  unit: {
    fontSize: 16,
    color: colors.slate[400],
    marginLeft: 4,
  },
  trend: {
    fontSize: 12,
    color: colors.cyan[400],
    fontWeight: '600',
  },
  trendContainer: {
    marginTop: 4,
  },
});