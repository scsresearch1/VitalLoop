/**
 * Daily Focus Hero Component
 * Hero banner with greeting and call-to-action
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import CinematicCard from './styled/CinematicCard';
import { colors } from '../theme/colors';
import Animated, { 
  FadeInDown, 
  FadeInRight 
} from 'react-native-reanimated';

interface DailyFocusHeroProps {
  userName?: string;
  onStartWorkout?: () => void;
}

export default function DailyFocusHero({ 
  userName = 'John',
  onStartWorkout 
}: DailyFocusHeroProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <Animated.View 
      entering={FadeInDown.duration(800)}
      style={styles.container}
    >
      <CinematicCard
        backgroundImage="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&q=80"
        overlayOpacity={0.5}
        style={styles.hero}
      >
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.3)', 'rgba(236, 72, 153, 0.2)', 'rgba(0, 0, 0, 0.9)']}
          style={styles.gradient}
        />
        <View style={styles.content}>
          <Animated.View 
            entering={FadeInRight.delay(200).duration(600)}
            style={styles.leftSection}
          >
            <Text style={styles.greeting}>
              {getGreeting()}, {userName}.
            </Text>
            <Text style={styles.subtitle}>
              Ready to crush your cardio?
            </Text>
            <TouchableOpacity 
              style={styles.button}
              onPress={onStartWorkout}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={colors.gradients.purplePink as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Start Workout</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </CinematicCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  hero: {
    height: 220,
    borderRadius: 24,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  leftSection: {
    flex: 1,
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.slate[300],
    marginBottom: 20,
  },
  button: {
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  buttonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});