/**
 * Bottom Navigation Component - Gen-Z Styled
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { 
  LayoutDashboard, 
  BarChart3, 
  Brain, 
  User, 
  Play 
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { colors } from '../theme/colors';

interface Tab {
  id: string;
  icon: any;
  label: string;
}

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const tabs: Tab[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
  { id: 'workout', icon: Play, label: 'Workout' },
  { id: 'metrics', icon: BarChart3, label: 'Metrics' },
  { id: 'insights', icon: Brain, label: 'Insights' },
  { id: 'profile', icon: User, label: 'Profile' },
];

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <View style={styles.container}>
      <BlurView intensity={20} style={styles.blur}>
        <View style={styles.content}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => onTabChange(tab.id)}
                style={styles.tab}
                activeOpacity={0.7}
              >
                {isActive && (
                  <Animated.View style={styles.activeBackground}>
                    <LinearGradient
                      colors={[colors.purple[500] + '30', colors.pink[500] + '30']}
                      style={styles.activeGradient}
                    />
                  </Animated.View>
                )}
                <Animated.View
                  style={[
                    styles.iconContainer,
                    isActive && styles.iconContainerActive,
                  ]}
                >
                  <tab.icon 
                    size={24} 
                    color={isActive ? colors.white : colors.white + '60'} 
                  />
                </Animated.View>
                <Text style={[
                  styles.label,
                  isActive && styles.labelActive,
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: colors.white + '10',
  },
  blur: {
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingBottom: 24,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 16,
    position: 'relative',
  },
  activeBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.purple[400] + '50',
  },
  activeGradient: {
    flex: 1,
    borderRadius: 16,
  },
  iconContainer: {
    marginBottom: 4,
  },
  iconContainerActive: {
    transform: [{ scale: 1.2 }],
  },
  label: {
    fontSize: 11,
    color: colors.white + '60',
    fontWeight: '500',
  },
  labelActive: {
    fontSize: 12,
    color: colors.white,
    fontWeight: '700',
  },
});
