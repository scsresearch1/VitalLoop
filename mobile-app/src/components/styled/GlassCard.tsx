/**
 * Glass Card Component
 * Gen-Z glassmorphism effect
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors } from '../../theme/colors';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  variant?: 'light' | 'medium' | 'strong';
}

export default function GlassCard({ 
  children, 
  style, 
  intensity = 20,
  variant = 'medium' 
}: GlassCardProps) {
  const glassColor = variant === 'light' 
    ? colors.glass.light 
    : variant === 'strong' 
    ? colors.glass.strong 
    : colors.glass.medium;

  return (
    <View style={[styles.container, style]}>
      <BlurView intensity={intensity} style={styles.blur}>
        <View style={[styles.content, { backgroundColor: glassColor }]}>
          {children}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  blur: {
    borderRadius: 24,
  },
  content: {
    borderRadius: 24,
    padding: 20,
  },
});
