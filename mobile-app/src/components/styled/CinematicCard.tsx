/**
 * Cinematic Card Component
 * Card with background image and dark overlay (Netflix-style)
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, Image, ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';

interface CinematicCardProps {
  children: React.ReactNode;
  backgroundImage?: string | ImageSourcePropType;
  style?: ViewStyle;
  overlayOpacity?: number;
}

export default function CinematicCard({ 
  children, 
  backgroundImage,
  style,
  overlayOpacity = 0.7 
}: CinematicCardProps) {
  const imageSource = typeof backgroundImage === 'string' 
    ? { uri: backgroundImage } 
    : backgroundImage;

  return (
    <View style={[styles.container, style]}>
      {backgroundImage && (
        <>
          <Image
            source={imageSource}
            style={styles.background}
            resizeMode="cover"
          />
          <View style={[styles.overlay, { opacity: overlayOpacity }]} />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
            style={styles.gradient}
          />
        </>
      )}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glass.border,
    position: 'relative',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.black,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    position: 'relative',
    zIndex: 10,
    padding: 20,
  },
});
