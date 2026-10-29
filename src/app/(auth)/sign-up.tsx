import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSignUp, useOAuth } from '@clerk/clerk-expo';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { AuthHeader } from '@/components/AuthHeader';
import { AuthTabs } from '@/components/AuthTabs';
import { InputField } from '@/components/InputField';
import { GradientButton } from '@/components/GradientButton';
import { SocialButton } from '@/components/SocialButton';
import { OtpVerificationModal } from '@/components/OtpVerificationModal';
import { syncUserToFirestore } from '@/services/firebase';
import { saveLocalUserSession } from '@/utils/localStorage';

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp, setActive, isLoaded } = useSignUp();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OTP Verification Modal State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  const validate = () => {
    if (!fullName.trim()) {
      setError('Please enter your full name');
      return false;
    }
    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!password) {
      setError('Please enter a password');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    setError(null);
    setLoading(true);

    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // If Clerk is not loaded or running in demo preview mode
    if (!isLoaded || !signUp) {
      setTimeout(async () => {
        setLoading(false);
        // Show the verification OTP modal for realistic experience
        setShowOtpModal(true);
      }, 800);
      return;
    }

    try {
      // 1. Create Clerk Sign-Up
      await signUp.create({
        emailAddress: email.trim(),
        password,
        firstName,
        lastName,
      });

      // 2. Prepare Email Verification (sends OTP email)
      await signUp.prepareEmailAddressVerification({
        strategy: 'email_code',
      });

      // 3. Open Dribbble-style Verification Modal
      setShowOtpModal(true);
    } catch (err: any) {
      console.error('[Clerk] Sign up error:', err);
      let msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        'Could not create account. Please check your information.';

      // Handle Clerk's breached password / 15 character rule
      if (
        err?.errors?.[0]?.code === 'form_password_pwned' ||
        msg.toLowerCase().includes('data breach') ||
        msg.toLowerCase().includes('15 character')
      ) {
        msg =
          'Clerk cloud detected this common password. To allow simple passwords, disable "Pwned passwords" in your Clerk Dashboard, or enter any other simple password.';
      }

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (code: string) => {
    setOtpError(null);
    setOtpLoading(true);

    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Demo Mode Verification Handler
    if (!isLoaded || !signUp) {
      setTimeout(async () => {
        setOtpLoading(false);
        setShowOtpModal(false);

        const demoId = 'demo_user_' + Date.now();

        // 1. Save session to LocalStorage
        await saveLocalUserSession({
          uid: demoId,
          email: email.trim(),
          displayName: fullName.trim(),
          firstName,
          lastName,
          authProvider: 'email_password',
        });

        // 2. Save new user profile to Firebase Firestore
        await syncUserToFirestore(
          {
            id: demoId,
            primaryEmailAddress: { emailAddress: email.trim() },
            firstName,
            lastName,
            fullName: fullName.trim(),
          },
          'email_password'
        );

        router.replace('/(main)/dashboard');
      }, 1000);
      return;
    }

    try {
      // Complete Clerk Email Verification
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status === 'complete') {
        if (setActive) {
          await setActive({ session: completeSignUp.createdSessionId });
        }

        const userId = completeSignUp.createdUserId || email.trim();

        // 1. Save session to LocalStorage for persistent login
        await saveLocalUserSession({
          uid: userId,
          email: email.trim(),
          displayName: fullName.trim(),
          firstName,
          lastName,
          authProvider: 'email_password',
        });

        // 2. Save newly registered user basic info and calorie goals to Firebase Firestore
        await syncUserToFirestore(
          {
            id: userId,
            primaryEmailAddress: { emailAddress: email.trim() },
            firstName,
            lastName,
            fullName: fullName.trim(),
          },
          'email_password'
        );

        setShowOtpModal(false);
        router.replace('/(main)/dashboard');
      } else {
        console.log('[Clerk] Additional sign-up status:', completeSignUp.status);
        setOtpError(`Verification status: ${completeSignUp.status}. Check requirements.`);
      }
    } catch (err: any) {
      console.error('[Clerk] OTP verification error:', err);
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        'Invalid verification code. Please try again.';
      setOtpError(msg);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!isLoaded || !signUp) {
      return;
    }
    try {
      await signUp.prepareEmailAddressVerification({
        strategy: 'email_code',
      });
    } catch (err: any) {
      setOtpError(err?.errors?.[0]?.message || 'Failed to resend code');
    }
  };

  const handleGoogleSignUp = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      const redirectUrl = Linking.createURL('/(main)/dashboard', {
        scheme: 'aicaltrack',
      });

      const { createdSessionId, setActive, signUp: oAuthSignUp } =
        await startOAuthFlow({
          redirectUrl,
        });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });

        const userId = oAuthSignUp?.createdUserId || 'google_user_' + Date.now();
        const userEmail = oAuthSignUp?.emailAddress || 'google-user@gmail.com';
        const userFullName = `${oAuthSignUp?.firstName || 'Google'} ${oAuthSignUp?.lastName || 'User'}`.trim();

        // 1. Save session to LocalStorage
        await saveLocalUserSession({
          uid: userId,
          email: userEmail,
          displayName: userFullName,
          authProvider: 'google',
        });

        // 2. Save Google profile to Firebase Firestore
        await syncUserToFirestore(
          {
            id: userId,
            primaryEmailAddress: {
              emailAddress: userEmail,
            },
            firstName: oAuthSignUp?.firstName || 'Google',
            lastName: oAuthSignUp?.lastName || 'User',
            fullName: userFullName,
          },
          'google'
        );

        router.replace('/(main)/dashboard');
      } else {
        // Fallback for preview
        const demoGoogleId = 'demo_google_user';
        const demoGoogleEmail = 'google.fitness@gmail.com';

        await saveLocalUserSession({
          uid: demoGoogleId,
          email: demoGoogleEmail,
          displayName: 'Fitness Pro',
          authProvider: 'google',
        });

        await syncUserToFirestore(
          {
            id: demoGoogleId,
            primaryEmailAddress: { emailAddress: demoGoogleEmail },
            fullName: 'Fitness Pro',
          },
          'google'
        );
        router.replace('/(main)/dashboard');
      }
    } catch (err: any) {
      console.error('[Clerk] Google OAuth error:', err);
      const msg =
        err?.errors?.[0]?.message ||
        err?.message ||
        'Google sign-up was cancelled or encountered an error.';
      setError(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <AuthHeader
          title="Create Account"
          subtitle="Start tracking calories & nutrition with AI guidance"
        />

        {/* Auth Card Container */}
        <View style={styles.card}>
          {/* Segmented Switcher */}
          <AuthTabs
            activeTab="sign-up"
            onTabChange={(tab) => {
              if (tab === 'sign-in') {
                router.replace('/(auth)/sign-in');
              }
            }}
          />

          {/* Social Sign Up (Google OAuth) */}
          <SocialButton
            onPress={handleGoogleSignUp}
            loading={googleLoading}
            label="Continue with Google"
          />

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or sign up with email</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Error Banner */}
          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={Colors.error} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          {/* Form Inputs */}
          <InputField
            label="Full Name"
            iconName="person-outline"
            placeholder="Alex Morgan"
            autoCapitalize="words"
            value={fullName}
            onChangeText={(text) => {
              setFullName(text);
              if (error) setError(null);
            }}
          />

          <InputField
            label="Email Address"
            iconName="mail-outline"
            placeholder="name@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (error) setError(null);
            }}
          />

          <InputField
            label="Password"
            iconName="lock-closed-outline"
            placeholder="Enter your password"
            isPassword
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (error) setError(null);
            }}
          />

          <InputField
            label="Confirm Password"
            iconName="shield-checkmark-outline"
            placeholder="Confirm your password"
            isPassword
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (error) setError(null);
            }}
          />

          {/* Sign Up CTA Button */}
          <GradientButton
            title="Create Account"
            onPress={handleSignUp}
            loading={loading}
            iconName="sparkles"
            style={styles.submitBtn}
          />
        </View>

        {/* Footer Link to Sign In */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Pressable
            hitSlop={8}
            onPress={() => router.replace('/(auth)/sign-in')}
          >
            <Text style={styles.footerLink}>Sign In</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Clerk Email OTP Verification Modal */}
      <OtpVerificationModal
        visible={showOtpModal}
        email={email}
        loading={otpLoading}
        error={otpError}
        onVerify={handleVerifyOtp}
        onResend={handleResendOtp}
        onClose={() => setShowOtpModal(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.divider,
  },
  dividerText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorBackground,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorBannerText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
  },
  submitBtn: {
    marginTop: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primaryLight,
  },
});

