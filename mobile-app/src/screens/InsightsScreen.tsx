/**
 * Insights Screen - Gen-Z Styled
 * AI insights display (UI only, no AI processing)
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
  Brain, 
  AlertTriangle, 
  CheckCircle, 
  Target, 
  TrendingUp,
  Sparkles 
} from 'lucide-react-native';
import CinematicCard from '../components/styled/CinematicCard';
import GlassCard from '../components/styled/GlassCard';
import { colors } from '../theme/colors';

export default function InsightsScreen() {
  // Mock insights - UI only, no AI processing
  const insights = [
    {
      type: 'stress',
      title: 'Stress Level: Moderate',
      score: 65,
      message: 'Your stress levels are manageable today. Consider a 10-minute meditation break.',
      color: colors.orange[400],
      icon: AlertTriangle,
      action: 'Try meditation',
      isPositive: false,
    },
    {
      type: 'illness',
      title: 'Illness Risk: Low',
      score: 15,
      message: 'No signs of illness detected. Your body is in good shape!',
      color: colors.green[400],
      icon: CheckCircle,
      action: null,
      isPositive: true,
    },
    {
      type: 'sleep',
      title: 'Sleep Optimization',
      score: 85,
      message: 'Your optimal bedtime is 10:30 PM tonight for best recovery.',
      color: colors.purple[400],
      icon: Target,
      action: 'Set reminder',
      isPositive: true,
    },
    {
      type: 'recovery',
      title: 'Recovery Status',
      score: 75,
      message: 'You\'re 75% recovered. Light activity recommended today.',
      color: colors.cyan[400],
      icon: TrendingUp,
      action: 'View plan',
      isPositive: true,
    },
  ];

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Header with Digital Brain */}
      <Animated.View entering={FadeInDown.duration(800)}>
        <CinematicCard
          backgroundImage="https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=1200&q=80"
          overlayOpacity={0.6}
          style={styles.hero}
        >
          <LinearGradient
            colors={[colors.purple[900] + '80', colors.pink[900] + '60', colors.cyan[900] + '80']}
            style={styles.heroGradient}
          />
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>AI Insights</Text>
            <Text style={styles.heroSubtitle}>
              Powered by <Text style={styles.highlight}>advanced AI</Text>
            </Text>
          </View>
        </CinematicCard>
      </Animated.View>

      {/* Insights Cards */}
      <View style={styles.insightsContainer}>
        {insights.map((insight, index) => (
          <Animated.View
            key={insight.type}
            entering={FadeInUp.delay(200 + index * 100).duration(600)}
          >
            <GlassCard
              variant="medium"
              style={[
                styles.insightCard,
                insight.isPositive ? styles.positiveBorder : styles.negativeBorder,
              ]}
            >
              <View style={styles.insightContent}>
                <View style={styles.insightHeader}>
                  <View style={[
                    styles.iconContainer,
                    insight.isPositive ? styles.positiveIcon : styles.negativeIcon,
                  ]}>
                    <insight.icon size={40} color={colors.white} />
                  </View>
                  <View style={styles.insightText}>
                    <Text style={styles.insightTitle}>{insight.title}</Text>
                    <Text style={styles.insightScore}>{insight.score}%</Text>
                  </View>
                </View>
                <Text style={styles.insightMessage}>{insight.message}</Text>
                {insight.action && (
                  <TouchableOpacity style={styles.actionButton}>
                    <LinearGradient
                      colors={colors.gradients.purplePink}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.actionGradient}
                    >
                      <Text style={styles.actionText}>{insight.action} →</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </GlassCard>
          </Animated.View>
        ))}
      </View>

      {/* AI Info Card */}
      <Animated.View entering={FadeInUp.delay(600).duration(600)}>
        <GlassCard variant="medium" style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Sparkles size={20} color={colors.purple[400]} />
            <Text style={styles.infoTitle}>How It Works</Text>
          </View>
          <Text style={styles.infoText}>
            Our advanced AI analyzes your health data (Heart Rate, Heart Rhythm, Blood Oxygen, 
            Blood Pressure, Temperature, Sleep) to provide personalized insights. The AI learns 
            your unique patterns and detects changes before they become problems.
          </Text>
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
  hero: {
    height: 240,
    marginBottom: 20,
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
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
  insightsContainer: {
    gap: 16,
    marginBottom: 20,
  },
  insightCard: {
    borderWidth: 2,
  },
  positiveBorder: {
    borderColor: colors.green[500] + '50',
  },
  negativeBorder: {
    borderColor: colors.red[500] + '50',
  },
  insightContent: {
    padding: 20,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 16,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.white + '10',
    borderWidth: 2,
    borderColor: colors.white + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  positiveIcon: {
    borderColor: colors.green[500] + '30',
  },
  negativeIcon: {
    borderColor: colors.red[500] + '30',
  },
  insightText: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 8,
  },
  insightScore: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
    opacity: 0.9,
  },
  insightMessage: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.7,
    lineHeight: 22,
    marginBottom: 16,
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  actionText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  infoCard: {
    marginTop: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  infoText: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.7,
    lineHeight: 22,
  },
});
