import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { isFirebaseConfigured } from '@/services/firebase';

interface FirebaseStatusBadgeProps {
  synced: boolean;
  hasError?: boolean;
  provider?: string;
}

export const FirebaseStatusBadge: React.FC<FirebaseStatusBadgeProps> = ({
  synced,
  hasError = false,
  provider,
}) => {
  return (
    <View
      style={[
        styles.badge,
        hasError
          ? styles.badgeError
          : synced
          ? styles.badgeSuccess
          : styles.badgePending,
      ]}
    >
      <Ionicons
        name={
          hasError
            ? 'alert-circle-outline'
            : synced
            ? 'cloud-done-outline'
            : 'cloud-upload-outline'
        }
        size={14}
        color={
          hasError
            ? Colors.error
            : synced
            ? Colors.primaryLight
            : Colors.warning
        }
      />
      <Text
        style={[
          styles.text,
          hasError
            ? styles.textError
            : synced
            ? styles.textSuccess
            : styles.textPending,
        ]}
      >
        {hasError
          ? 'Rules Blocked'
          : synced
          ? isFirebaseConfigured
            ? 'Synced to Firestore'
            : 'Synced (Demo Ready)'
          : 'Syncing...'}
      </Text>
      {provider ? (
        <View style={styles.providerTag}>
          <Text style={styles.providerText}>{provider}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  badgePending: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  badgeError: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  textSuccess: {
    color: Colors.primaryLight,
  },
  textPending: {
    color: Colors.warning,
  },
  textError: {
    color: Colors.error,
  },
  providerTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 2,
  },
  providerText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});

