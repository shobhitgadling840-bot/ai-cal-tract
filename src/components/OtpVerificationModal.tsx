import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/theme';
import { GradientButton } from './GradientButton';

interface OtpVerificationModalProps {
  visible: boolean;
  email: string;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  onClose: () => void;
  loading?: boolean;
  error?: string | null;
}

export const OtpVerificationModal: React.FC<OtpVerificationModalProps> = ({
  visible,
  email,
  onVerify,
  onResend,
  onClose,
  loading = false,
  error,
}) => {
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    let timer: any;
    if (visible && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [visible, countdown]);

  const handleResend = async () => {
    if (!canResend || resending) return;
    try {
      setResending(true);
      await onResend();
      setCountdown(60);
      setCanResend(false);
    } catch {
      // Handled in parent
    } finally {
      setResending(false);
    }
  };

  const handleCodeChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
    setCode(cleaned);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.cardContainer}>
          <LinearGradient
            colors={['#172238', '#0F1728']}
            style={styles.card}
          >
            {/* Close Button */}
            <Pressable
              hitSlop={10}
              onPress={onClose}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={20} color={Colors.textMuted} />
            </Pressable>

            {/* Icon Header */}
            <View style={styles.iconCircle}>
              <Ionicons
                name="mail-unread-outline"
                size={30}
                color={Colors.primaryLight}
              />
            </View>

            <Text style={styles.title}>Check Your Email</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit confirmation code to:
            </Text>
            <Text style={styles.emailText}>{email}</Text>

            {/* 6 Digits Display Boxes */}
            <View style={styles.codeBoxesContainer}>
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const char = code[index] || '';
                const isCurrent = index === code.length;
                return (
                  <View
                    key={index}
                    style={[
                      styles.codeBox,
                      char ? styles.codeBoxFilled : null,
                      isCurrent ? styles.codeBoxActive : null,
                    ]}
                  >
                    <Text style={styles.codeDigit}>{char}</Text>
                  </View>
                );
              })}
            </View>

            {/* Hidden Input Layer for full keypad control */}
            <TextInput
              value={code}
              onChangeText={handleCodeChange}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              style={styles.hiddenInput}
              selectionColor={Colors.primary}
            />

            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Submit Button */}
            <GradientButton
              title="Verify & Complete Account"
              onPress={() => onVerify(code)}
              loading={loading}
              disabled={code.length < 6}
              style={styles.verifyButton}
            />

            {/* Resend Section */}
            <View style={styles.resendRow}>
              <Text style={styles.resendLabel}>Didn't receive code? </Text>
              {canResend ? (
                <Pressable onPress={handleResend} disabled={resending}>
                  {resending ? (
                    <ActivityIndicator size="small" color={Colors.primaryLight} />
                  ) : (
                    <Text style={styles.resendAction}>Resend Code</Text>
                  )}
                </Pressable>
              ) : (
                <Text style={styles.countdownText}>
                  Resend in {countdown}s
                </Text>
              )}
            </View>
          </LinearGradient>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 15, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  card: {
    padding: 24,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emailText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primaryLight,
    marginTop: 2,
    marginBottom: 20,
    textAlign: 'center',
  },
  codeBoxesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    width: '100%',
  },
  codeBox: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#0A101C',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxFilled: {
    borderColor: 'rgba(16, 185, 129, 0.5)',
    backgroundColor: '#0F1A2D',
  },
  codeBoxActive: {
    borderColor: Colors.primary,
    backgroundColor: '#122038',
  },
  codeDigit: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0.01,
    width: 1,
    height: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
    gap: 6,
    width: '100%',
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  verifyButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendLabel: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  resendAction: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryLight,
  },
  countdownText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
});

