import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { Colors } from '@/constants/theme';
import { isLocallySignedIn } from '@/utils/localStorage';

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();
  const [localChecked, setLocalChecked] = useState(false);
  const [localLoggedIn, setLocalLoggedIn] = useState(false);

  useEffect(() => {
    async function checkLocalStorage() {
      const logged = await isLocallySignedIn();
      setLocalLoggedIn(logged);
      setLocalChecked(true);
    }
    checkLocalStorage();
  }, []);

  // Show branding splash while determining authentication state
  if (!isLoaded || !localChecked) {
    return (
      <View style={styles.container}>
        <View style={styles.logoCircle}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <ActivityIndicator
          size="large"
          color={Colors.primary}
          style={styles.spinner}
        />
      </View>
    );
  }

  // If user is already authenticated via Clerk or saved in LocalStorage -> route to Dashboard
  if (isSignedIn || localLoggedIn) {
    return <Redirect href="/(main)/dashboard" />;
  }

  // If user is not signed in / signed up -> navigate to Sign In screen
  return <Redirect href="/(auth)/sign-in" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 30,
    backgroundColor: '#121A2C',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  logo: {
    width: 56,
    height: 56,
  },
  spinner: {
    marginTop: 28,
  },
});
