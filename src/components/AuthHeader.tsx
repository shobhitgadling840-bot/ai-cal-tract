import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/theme';

interface AuthHeaderProps {
  title: string;
  subtitle: string;
  tagline?: string;
}

export const AuthHeader: React.FC<AuthHeaderProps> = ({
  title,
  subtitle,
  tagline = 'AI NUTRITION INTELLIGENCE',
}) => {
  return (
    <View style={styles.container}>
      {/* Glowing Brand Icon Section */}
      <View style={styles.logoWrapper}>
        {/* Ambient Glow */}
        <LinearGradient
          colors={['rgba(16, 185, 129, 0.4)', 'rgba(6, 182, 212, 0)']}
          style={styles.ambientGlow}
        />

        {/* Outer Ring */}
        <View style={styles.outerRing}>
          {/* Main Logo Card */}
          <LinearGradient
            colors={['#16233B', '#0E1728']}
            style={styles.logoCard}
          >
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </LinearGradient>

          {/* Floating Fire Mini-Badge */}
          <View style={styles.fireBadge}>
            <Image
              source={require('@/assets/images/fire.png')}
              style={styles.fireImage}
              resizeMode="contain"
            />
          </View>
        </View>
      </View>

      {/* Pill Badge */}
      <View style={styles.badgePill}>
        <Text style={styles.badgeSpark}>✦</Text>
        <Text style={styles.badgeText}>{tagline}</Text>
      </View>

      {/* Titles */}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 12,
  },
  logoWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  ambientGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  outerRing: {
    position: 'relative',
    padding: 3,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  logoCard: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  logoImage: {
    width: 48,
    height: 48,
  },
  fireBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6433',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
    shadowColor: '#FF6433',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  fireImage: {
    width: 16,
    height: 16,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    marginBottom: 10,
    gap: 6,
  },
  badgeSpark: {
    color: Colors.primaryLight,
    fontSize: 12,
  },
  badgeText: {
    color: Colors.primaryLight,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
});

