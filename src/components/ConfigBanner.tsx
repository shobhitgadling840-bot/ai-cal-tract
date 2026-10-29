import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { isFirebaseConfigured } from '@/services/firebase';

interface ConfigBannerProps {
  hasClerkKey: boolean;
}

export const ConfigBanner: React.FC<ConfigBannerProps> = ({ hasClerkKey }) => {
  const [modalVisible, setModalVisible] = useState(false);

  // If both are properly configured, don't show the warning banner
  if (hasClerkKey && isFirebaseConfigured) {
    return null;
  }

  return (
    <>
      <Pressable
        onPress={() => setModalVisible(true)}
        style={styles.banner}
      >
        <Ionicons name="information-circle-outline" size={16} color={Colors.warning} />
        <Text style={styles.bannerText}>
          {!hasClerkKey
            ? 'Running in Demo Mode: Tap to configure Clerk & Firebase keys'
            : 'Firebase running in demo mode: Tap to view config'}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={Colors.warning} />
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.titleRow}>
                <Ionicons name="settings-outline" size={20} color={Colors.primaryLight} />
                <Text style={styles.modalTitle}>API Configuration Guide</Text>
              </View>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color={Colors.textMuted} />
              </Pressable>
            </View>

            <Text style={styles.modalDesc}>
              To connect real live Clerk Authentication and Firebase Firestore:
            </Text>

            <View style={styles.stepCard}>
              <Text style={styles.stepTitle}>1. Clerk Auth Keys</Text>
              <Text style={styles.stepBody}>
                Get your Publishable Key from dashboard.clerk.com and set:
              </Text>
              <View style={styles.codeSnippet}>
                <Text style={styles.codeText}>
                  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
                </Text>
              </View>
            </View>

            <View style={styles.stepCard}>
              <Text style={styles.stepTitle}>2. Firebase Firestore</Text>
              <Text style={styles.stepBody}>
                Get web credentials from console.firebase.google.com and set:
              </Text>
              <View style={styles.codeSnippet}>
                <Text style={styles.codeText}>
                  EXPO_PUBLIC_FIREBASE_API_KEY=AIza...{'\n'}
                  EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => setModalVisible(false)}
              style={styles.doneBtn}
            >
              <Text style={styles.doneBtnText}>Got it, Continue Preview</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.25)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  bannerText: {
    color: Colors.warning,
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 15, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#121A2C',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeBtn: {
    padding: 4,
  },
  modalDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  stepCard: {
    backgroundColor: '#0A101C',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primaryLight,
    marginBottom: 4,
  },
  stepBody: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 6,
  },
  codeSnippet: {
    backgroundColor: '#05080E',
    borderRadius: 8,
    padding: 8,
  },
  codeText: {
    fontFamily: 'Courier',
    fontSize: 11,
    color: '#34D399',
  },
  doneBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});

