/**
 * Workout Selection Screen - Gen-Z Styled
 * Netflix-style workout selection
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { 
  Play, 
  Footprints, 
  Dumbbell, 
  Bike, 
  Waves, 
  Activity, 
  Zap,
  Clock,
  Flame,
} from 'lucide-react-native';
import CinematicCard from '../components/styled/CinematicCard';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface WorkoutType {
  id: string;
  name: string;
  icon: any;
  color: string[];
  duration: string;
  calories: string;
  intensity: string;
  description: string;
  backgroundImage: string;
}

interface WorkoutSelectionScreenProps {
  onStartWorkout: (workout: WorkoutType) => void;
}

export default function WorkoutSelectionScreen({ onStartWorkout }: WorkoutSelectionScreenProps) {
  const workoutTypes: WorkoutType[] = [
    {
      id: 'running',
      name: 'Running',
      icon: Footprints,
      color: [colors.red[500], colors.pink[500]],
      duration: '30 min',
      calories: '~300',
      intensity: 'High',
      description: 'Outdoor or treadmill running',
      backgroundImage: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
    },
    {
      id: 'cycling',
      name: 'Cycling',
      icon: Bike,
      color: [colors.blue[500], colors.cyan[500]],
      duration: '45 min',
      calories: '~400',
      intensity: 'Moderate',
      description: 'Indoor or outdoor cycling',
      backgroundImage: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800&q=80',
    },
    {
      id: 'strength',
      name: 'Strength',
      icon: Dumbbell,
      color: [colors.purple[500], colors.indigo[500]],
      duration: '60 min',
      calories: '~250',
      intensity: 'Moderate',
      description: 'Weight training & resistance',
      backgroundImage: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&q=80',
    },
    {
      id: 'yoga',
      name: 'Yoga',
      icon: Waves,
      color: [colors.green[500], colors.emerald[500]],
      duration: '30 min',
      calories: '~120',
      intensity: 'Low',
      description: 'Flexibility & mindfulness',
      backgroundImage: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80',
    },
    {
      id: 'hiit',
      name: 'HIIT',
      icon: Zap,
      color: [colors.orange[500], colors.red[500]],
      duration: '20 min',
      calories: '~250',
      intensity: 'Very High',
      description: 'High-intensity interval training',
      backgroundImage: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&q=80',
    },
    {
      id: 'walking',
      name: 'Walking',
      icon: Activity,
      color: [colors.cyan[500], colors.blue[500]],
      duration: '45 min',
      calories: '~180',
      intensity: 'Low',
      description: 'Casual or power walking',
      backgroundImage: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
    },
  ];

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'Very High': return colors.red[500];
      case 'High': return colors.orange[500];
      case 'Moderate': return colors.yellow[500];
      default: return colors.green[500];
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Featured Workout Hero */}
      <Animated.View entering={FadeInDown.duration(800)}>
        <CinematicCard
          backgroundImage="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80"
          overlayOpacity={0.7}
          style={styles.featuredHero}
        >
          <View style={styles.featuredContent}>
            <Text style={styles.featuredLabel}>Workout of the Day</Text>
            <Text style={styles.featuredTitle}>High Intensity Interval</Text>
            <Text style={styles.featuredDescription}>
              Push your limits with this intense 20-minute session designed to maximize your calorie burn.
            </Text>
            <TouchableOpacity
              onPress={() => {
                const hiitWorkout = workoutTypes.find(w => w.id === 'hiit');
                if (hiitWorkout) onStartWorkout(hiitWorkout);
              }}
              style={styles.featuredButton}
            >
              <LinearGradient
                colors={[colors.orange[500], colors.red[500]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.featuredButtonGradient}
              >
                <Play size={20} color={colors.white} />
                <Text style={styles.featuredButtonText}>Start Now</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </CinematicCard>
      </Animated.View>

      {/* Workout Types Grid */}
      <View style={styles.workoutGrid}>
        {workoutTypes.map((workout, index) => (
          <Animated.View
            key={workout.id}
            entering={FadeInUp.delay(200 + index * 100).duration(600)}
            style={styles.workoutCardWrapper}
          >
            <TouchableOpacity
              onPress={() => onStartWorkout(workout)}
              activeOpacity={0.9}
            >
              <CinematicCard
                backgroundImage={workout.backgroundImage}
                overlayOpacity={0.6}
                style={[styles.workoutCard, { width: CARD_WIDTH }]}
              >
                <View style={styles.workoutCardContent}>
                  <View style={styles.workoutCardHeader}>
                    <LinearGradient
                      colors={workout.color}
                      style={styles.workoutIcon}
                    >
                      <workout.icon size={24} color={colors.white} />
                    </LinearGradient>
                    <View style={styles.playButton}>
                      <Play size={16} color={colors.white} />
                    </View>
                  </View>
                  
                  <View style={styles.workoutCardFooter}>
                    <Text style={styles.workoutName}>{workout.name}</Text>
                    <Text style={styles.workoutDescription}>{workout.description}</Text>
                    
                    <View style={styles.workoutStats}>
                      <View style={styles.workoutStat}>
                        <Clock size={14} color={colors.white} opacity={0.9} />
                        <Text style={styles.workoutStatText}>{workout.duration}</Text>
                      </View>
                      <View style={styles.workoutStat}>
                        <Flame size={14} color={colors.white} opacity={0.9} />
                        <Text style={styles.workoutStatText}>{workout.calories}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.intensityContainer}>
                      <Text style={styles.intensityLabel}>Intensity</Text>
                      <View style={[styles.intensityBadge, { backgroundColor: getIntensityColor(workout.intensity) + '30' }]}>
                        <Text style={[styles.intensityText, { color: getIntensityColor(workout.intensity) }]}>
                          {workout.intensity}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </CinematicCard>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
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
  featuredHero: {
    height: 280,
    marginBottom: 24,
  },
  featuredContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
  },
  featuredLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.orange[400],
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  featuredTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 12,
  },
  featuredDescription: {
    fontSize: 16,
    color: colors.white,
    opacity: 0.8,
    marginBottom: 20,
    lineHeight: 24,
  },
  featuredButton: {
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  featuredButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  featuredButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  workoutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  workoutCardWrapper: {
    marginBottom: 16,
  },
  workoutCard: {
    height: 280,
  },
  workoutCardContent: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 16,
  },
  workoutCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  workoutIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutCardFooter: {
    gap: 8,
  },
  workoutName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
  },
  workoutDescription: {
    fontSize: 12,
    color: colors.white,
    opacity: 0.9,
  },
  workoutStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  workoutStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  workoutStatText: {
    fontSize: 12,
    color: colors.white,
    opacity: 0.9,
    fontWeight: '600',
  },
  intensityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.white + '20',
  },
  intensityLabel: {
    fontSize: 10,
    color: colors.white,
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  intensityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  intensityText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
