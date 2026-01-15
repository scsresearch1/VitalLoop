/**
 * Profile Screen - Gen-Z Styled
 * User profile and settings
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { 
  User, 
  Settings, 
  Bell, 
  Shield, 
  HelpCircle, 
  LogOut,
  Trophy,
  Zap,
  Target,
  Award,
} from 'lucide-react-native';
import CinematicCard from '../components/styled/CinematicCard';
import GlassCard from '../components/styled/GlassCard';
import { colors } from '../theme/colors';

export default function ProfileScreen() {
  const userName = 'John Doe';
  const userEmail = 'john.doe@example.com';
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase();

  const achievements = [
    { id: 1, name: '7 Day Streak', icon: Zap, color: colors.yellow[500] },
    { id: 2, name: '100k Steps', icon: Target, color: colors.cyan[500] },
    { id: 3, name: 'Early Bird', icon: Award, color: colors.pink[500] },
    { id: 4, name: 'Marathon', icon: Trophy, color: colors.green[500] },
  ];

  const menuItems = [
    { icon: User, label: 'Edit Profile', color: colors.gradients.purplePink },
    { icon: Settings, label: 'Settings', color: colors.gradients.purplePink },
    { icon: Bell, label: 'Notifications', color: [colors.orange[500], colors.red[500]] },
    { icon: Shield, label: 'Privacy & Security', color: [colors.green[500], colors.emerald[500]] },
    { icon: HelpCircle, label: 'Help & Support', color: [colors.indigo[500], colors.purple[500]] },
    { icon: LogOut, label: 'Sign Out', color: [colors.red[500], colors.pink[500]] },
  ];

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Cover Photo */}
      <Animated.View entering={FadeInDown.duration(800)}>
        <CinematicCard
          backgroundImage="https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1200&q=80"
          overlayOpacity={0.5}
          style={styles.coverPhoto}
        >
          <LinearGradient
            colors={[colors.purple[900] + '60', colors.pink[900] + '40', colors.cyan[900] + '60']}
            style={styles.coverGradient}
          />
        </CinematicCard>
      </Animated.View>

      {/* Profile Card */}
      <Animated.View entering={FadeInUp.delay(200).duration(600)}>
        <View style={styles.profileSection}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={colors.gradients.primary}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{initials}</Text>
            </LinearGradient>
          </View>

          {/* Profile Info */}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{userName}</Text>
            <Text style={styles.profileEmail}>{userEmail}</Text>
            <Text style={styles.memberSince}>Member since Jan 2024</Text>
          </View>
        </View>

        {/* Trophy Case */}
        <GlassCard variant="medium" style={styles.trophyCard}>
          <View style={styles.trophyHeader}>
            <Trophy size={24} color={colors.yellow[400]} />
            <Text style={styles.trophyTitle}>Trophy Case</Text>
          </View>
          <View style={styles.achievementsGrid}>
            {achievements.map((achievement) => (
              <View key={achievement.id} style={styles.achievementCard}>
                <View style={[styles.achievementIcon, { backgroundColor: achievement.color + '20' }]}>
                  <achievement.icon size={24} color={achievement.color} />
                </View>
                <Text style={styles.achievementName}>{achievement.name}</Text>
                <Text style={styles.achievementStatus}>Unlocked</Text>
              </View>
            ))}
          </View>
        </GlassCard>
      </Animated.View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <Animated.View
            key={item.label}
            entering={FadeInUp.delay(300 + index * 80).duration(500)}
          >
            <TouchableOpacity>
              <GlassCard variant="medium" style={styles.menuItem}>
                <View style={styles.menuItemContent}>
                  <LinearGradient
                    colors={item.color}
                    style={styles.menuIcon}
                  >
                    <item.icon size={24} color={colors.white} />
                  </LinearGradient>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuArrow}>→</Text>
                </View>
              </GlassCard>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      {/* App Info */}
      <Animated.View entering={FadeInUp.delay(800).duration(500)}>
        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>VitalLoop v1.0.0</Text>
          <Text style={styles.appTagline}>Your Vital Loop to Better Health</Text>
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
    paddingBottom: 100,
  },
  coverPhoto: {
    height: 240,
    marginBottom: 80,
  },
  coverGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    marginTop: -64,
    marginBottom: 16,
  },
  avatar: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.black,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.white,
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.purple[400],
    marginBottom: 8,
  },
  profileEmail: {
    fontSize: 16,
    color: colors.white,
    opacity: 0.6,
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.5,
  },
  trophyCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 20,
  },
  trophyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  trophyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  achievementCard: {
    width: '47%',
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.white + '05',
    borderWidth: 1,
    borderColor: colors.white + '10',
    alignItems: 'center',
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  achievementName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
    textAlign: 'center',
  },
  achievementStatus: {
    fontSize: 12,
    color: colors.white,
    opacity: 0.6,
  },
  menuContainer: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  menuItem: {
    padding: 0,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  menuArrow: {
    fontSize: 20,
    color: colors.white,
    opacity: 0.4,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  appVersion: {
    fontSize: 14,
    color: colors.slate[400],
    marginBottom: 4,
  },
  appTagline: {
    fontSize: 12,
    color: colors.slate[500],
  },
});
