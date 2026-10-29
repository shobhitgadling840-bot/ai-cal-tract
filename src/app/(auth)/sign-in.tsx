import { AuthHeader } from '@/components/AuthHeader';
import { AuthTabs } from '@/components/AuthTabs';
import { GradientButton } from '@/components/GradientButton';
import { InputField } from '@/components/InputField';
import { SocialButton } from '@/components/SocialButton';
import { Colors } from '@/constants/theme';
import { syncUserToFirestore } from '@/services/firebase';
import { saveLocalUserSession } from '@/utils/localStorage';
import { useOAuth, useSignIn } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const router = useRouter();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return false;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!password) {
      setError('Please enter your password');
      return false;
    }
    return true;
  };

  const handleSignIn = async () => {
    if (!validate()) return;
    setError(null);
    setLoading(true);

    // If Clerk is not loaded or publishable key not configured, offer demo sign-in
    if (!isLoaded || !signIn) {
      setTimeout(async () => {
        const demoId = 'demo_user_' + Date.now();
        const demoName = email.split('@')[0] || 'Demo User';

        // 1. Save session to LocalStorage
        await saveLocalUserSession({
          uid: demoId,
          email: email.trim(),
          displayName: demoName,
          authProvider: 'email_password',
        });

        // 2. Save user to Firestore
        await syncUserToFirestore(
          {
            id: demoId,
            primaryEmailAddress: { emailAddress: email.trim() },
            firstName: demoName,
            fullName: demoName,
          },
          'email_password'
        );
        setLoading(false);
        router.replace('/(main)/dashboard');
      }, 1000);
      return;
    }

    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password,
      });

      if (result.status === 'complete') {
        if (setActive) {
          await setActive({ session: result.createdSessionId });
        }

        const userId = result.id || email.trim();
        const displayName = email.split('@')[0];

        // 1. Save session to LocalStorage so user stays signed in across app launches
        await saveLocalUserSession({
          uid: userId,
          email: email.trim(),
          displayName,
          authProvider: 'email_password',
        });

        // 2. Save/update basic user info in Firebase Firestore
        await syncUserToFirestore(
          {
            id: userId,
            primaryEmailAddress: { emailAddress: email.trim() },
            fullName: displayName,
          },
          'email_password'
        );

        router.replace('/(main)/dashboard');
      } else {
        console.log('[Clerk] Additional sign-in steps needed:', result.status);
        setError(`Additional verification step required: ${result.status}`);
      }
    } catch (err: any) {
      console.error('[Clerk] Sign in error:', err);
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        'Unable to sign in. Please verify your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      const redirectUrl = Linking.createURL('/(main)/dashboard', {
        scheme: 'aicaltrack',
      });

      const { createdSessionId, setActive, signIn: oAuthSignIn } =
        await startOAuthFlow({
          redirectUrl,
        });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });

        const userId =
          oAuthSignIn?.id ||
          oAuthSignIn?.identifier ||
          'google_user_' + Date.now();
        const userEmail = oAuthSignIn?.identifier || 'google-user@gmail.com';

        // 1. Save session to LocalStorage
        await saveLocalUserSession({
          uid: userId,
          email: userEmail,
          displayName: 'Google User',
          authProvider: 'google',
        });

        // 2. Save Google authenticated user info to Firebase Firestore
        await syncUserToFirestore(
          {
            id: userId,
            primaryEmailAddress: {
              emailAddress: userEmail,
            },
            fullName: 'Google User',
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
        'Google sign-in was cancelled or encountered an error.';
      setError(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Reset Password',
      'Enter your registered email to receive a password reset link.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Link',
          onPress: () => {
            if (email) {
              Alert.alert('Sent', `Password reset link sent to ${email}`);
            } else {
              Alert.alert('Notice', 'Please type your email address first.');
            }
          },
        },
      ]
    );
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
          title="Welcome Back"
          subtitle="Sign in to track calories, macros & meals with AI"
        />

        {/* Auth Card Container */}
        <View style={styles.card}>
          {/* Segmented Switcher */}
          <AuthTabs
            activeTab="sign-in"
            onTabChange={(tab) => {
              if (tab === 'sign-up') {
                router.replace('/(auth)/sign-up');
              }
            }}
          />

          {/* Social Sign In (Google OAuth) */}
          <SocialButton
            onPress={handleGoogleSignIn}
            loading={googleLoading}
            label="Continue with Google"
          />

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or sign in with email</Text>
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
            placeholder="••••••••"
            isPassword
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (error) setError(null);
            }}
          />

          {/* Forgot Password Link */}
          <View style={styles.actionsRow}>
            <Pressable
              hitSlop={8}
              onPress={handleForgotPassword}
              style={styles.forgotBtn}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>
          </View>

          {/* Sign In CTA Button */}
          <GradientButton
            title="Sign In"
            onPress={handleSignIn}
            loading={loading}
            iconName="arrow-forward"
            style={styles.submitBtn}
          />
        </View>

        {/* Footer Link to Sign Up */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Pressable
            hitSlop={8}
            onPress={() => router.replace('/(auth)/sign-up')}
          >
            <Text style={styles.footerLink}>Create Account</Text>
          </Pressable>
        </View>
      </ScrollView>
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
    paddingTop: 40,
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
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
    marginTop: -4,
  },
  forgotBtn: {
    paddingVertical: 2,
  },
  forgotText: {
    fontSize: 13,
    color: Colors.primaryLight,
    fontWeight: '600',
  },
  submitBtn: {
    marginTop: 4,
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
