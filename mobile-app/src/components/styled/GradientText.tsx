/**
 * Gradient Text Component
 * Simplified gradient text effect for React Native
 */

import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { colors } from '../../theme/colors';

interface GradientTextProps {
  children: React.ReactNode;
  style?: TextStyle;
  colors?: string[];
}

export default function GradientText({ 
  children, 
  style,
  colors: gradientColors = colors.gradients.text,
}: GradientTextProps) {
  // React Native doesn't support CSS gradient text natively
  // Using the primary gradient color as a compromise
  return (
    <Text style={[styles.text, style, { color: gradientColors[1] }]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 32,
    fontWeight: '700',
  },
});
