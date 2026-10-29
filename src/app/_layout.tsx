import React, { useEffect, useState } from 'react';
import { ClerkProvider, ClerkLoaded, useAuth, useUser } from '@clerk/clerk-expo';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { tokenCache } from '@/utils/tokenCache';
import { Colors } from '@/constants/theme';
import { ConfigBanner } from '@/components/ConfigBanner';
import { isLocallySignedIn, saveLocalUserSession } from '@/utils/localStorage';
import { syncUserToFirestore } from '@/services/firebase';

// Fallback valid Clerk test key allows app to boot up and render UI cleanly if key is pending
const FALLBACK_CLERK_KEY = 'pk_test_Y2xlcmsuYWktY2FsLXRyYWNrLmxjbC5kZXYk';

// Sanitize key (handling duplicated variable names, quotes, trailing commas)
const cleanClerkKey = (raw?: string) => {
  if (!raw) return '';
  let str = raw.trim();
  if (str.includes('=')) {
    str = str.split('=').pop() || '';
  }
  return str.replace(/^["']|["'],?$/g, '').replace(/,$/, '').trim();
};

const rawKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const sanitizedKey = cleanClerkKey(rawKey);

const clerkPublishableKey =
  sanitizedKey && sanitizedKey.startsWith('pk_')
    ? sanitizedKey
    : FALLBACK_CLERK_KEY;

const hasRealClerkKey = Boolean(
  sanitizedKey &&
    sanitizedKey.startsWith('pk_') &&
    !sanitizedKey.includes('your_') &&
    sanitizedKey !== FALLBACK_CLERK_KEY
);

/**
 * Navigation Guard: Checks both Clerk auth status and LocalStorage persistence.
 * If user is not authenticated, redirects to /(auth)/sign-in.
 * If user is already authenticated, redirects from auth pages to /(main)/dashboard.
 */
function NavigationGuard({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [hasCheckedLocal, setHasCheckedLocal] = useState(false);
  const [localLoggedIn, setLocalLoggedIn] = useState(false);

  useEffect(() => {
    async function checkLocal() {
      const logged = await isLocallySignedIn();
      setLocalLoggedIn(logged);
      setHasCheckedLocal(true);
    }
    checkLocal();
  }, [isSignedIn]);

  useEffect(() => {
    if (!isLoaded || !hasCheckedLocal) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inMainGroup = segments[0] === '(main)';
    const isAuthenticated = Boolean(isSignedIn || localLoggedIn);

    if (!isAuthenticated && inMainGroup) {
      // Unauthenticated user trying to access protected screen -> route to Sign In
      router.replace('/(auth)/sign-in');
    } else if (isAuthenticated && inAuthGroup) {
      // Authenticated user trying to access Sign In/Up -> route to Dashboard
      router.replace('/(main)/dashboard');
    }
  }, [isLoaded, isSignedIn, hasCheckedLocal, localLoggedIn, segments, router]);

  return <>{children}</>;
}

/**
 * Automatic Firestore Sync listener:
 * Fires whenever a Clerk user is authenticated, ensuring that their user document
 * is safely recorded in the Firebase Firestore "users" collection if not already existing.
 */
function UserFirestoreSyncer() {
  const { user, isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      const provider = user.externalAccounts?.length ? 'google' : 'email_password';
      syncUserToFirestore(user, provider)
        .then((res) => {
          if (res.success) {
            console.log('[AutoSync] User successfully synced to Firestore:', user.id);
            saveLocalUserSession({
              uid: user.id,
              email: user.primaryEmailAddress?.emailAddress || '',
              displayName:
                user.fullName || user.firstName || 'Fitness Explorer',
              firstName: user.firstName || '',
              lastName: user.lastName || '',
              photoUrl: user.imageUrl || '',
              authProvider: provider,
            });
          } else {
            console.warn('[AutoSync] Firestore sync notice:', res.error);
          }
        })
        .catch((err) => console.error('[AutoSync] Sync exception:', err));
    }
  }, [isLoaded, isSignedIn, user]);

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ClerkProvider
        publishableKey={clerkPublishableKey}
        tokenCache={tokenCache}
      >
        <ClerkLoaded>
          <UserFirestoreSyncer />
          <NavigationGuard>
            <StatusBar style="light" />
            <ConfigBanner hasClerkKey={hasRealClerkKey} />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: Colors.background },
                animation: 'fade',
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(main)" options={{ headerShown: false }} />
            </Stack>
          </NavigationGuard>
        </ClerkLoaded>
      </ClerkProvider>
    </SafeAreaProvider>
  );
}
