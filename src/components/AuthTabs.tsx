import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/theme';

interface AuthTabsProps {
  activeTab: 'sign-in' | 'sign-up';
  onTabChange: (tab: 'sign-in' | 'sign-up') => void;
}

export const AuthTabs: React.FC<AuthTabsProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <View style={styles.container}>
      {/* Sign In Tab */}
      <Pressable
        onPress={() => onTabChange('sign-in')}
        style={styles.tabPressable}
      >
        {activeTab === 'sign-in' ? (
          <LinearGradient
            colors={['#1F2D47', '#172238']}
            style={styles.activeTabGradient}
          >
            <Text style={styles.activeTabText}>Sign In</Text>
          </LinearGradient>
        ) : (
          <View style={styles.inactiveTab}>
            <Text style={styles.inactiveTabText}>Sign In</Text>
          </View>
        )}
      </Pressable>

      {/* Sign Up Tab */}
      <Pressable
        onPress={() => onTabChange('sign-up')}
        style={styles.tabPressable}
      >
        {activeTab === 'sign-up' ? (
          <LinearGradient
            colors={['#1F2D47', '#172238']}
            style={styles.activeTabGradient}
          >
            <Text style={styles.activeTabText}>Create Account</Text>
          </LinearGradient>
        ) : (
          <View style={styles.inactiveTab}>
            <Text style={styles.inactiveTabText}>Create Account</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#0C1322',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 20,
    width: '100%',
  },
  tabPressable: {
    flex: 1,
  },
  activeTabGradient: {
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  activeTabText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  inactiveTab: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveTabText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
});

