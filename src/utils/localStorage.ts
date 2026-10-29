import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const USER_SESSION_KEY = 'aicaltrack_user_session';

export interface StoredUserSession {
  uid: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  authProvider: 'email_password' | 'google' | 'clerk';
  savedAt: string;
  isLoggedIn: boolean;
}

/**
 * Persists the user session to local storage (SecureStore on mobile, localStorage on web)
 * so the user remains signed in across app launches.
 */
export async function saveLocalUserSession(
  session: Omit<StoredUserSession, 'savedAt' | 'isLoggedIn'>
): Promise<void> {
  const payload: StoredUserSession = {
    ...session,
    savedAt: new Date().toISOString(),
    isLoggedIn: true,
  };
  const json = JSON.stringify(payload);

  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(USER_SESSION_KEY, json);
      }
      return;
    }
    await SecureStore.setItemAsync(USER_SESSION_KEY, json);
  } catch (error) {
    console.warn('[LocalStorage] Failed to save user session:', error);
  }
}

/**
 * Retrieves the stored user session from local storage.
 */
export async function getLocalUserSession(): Promise<StoredUserSession | null> {
  try {
    let json: string | null = null;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        json = window.localStorage.getItem(USER_SESSION_KEY);
      }
    } else {
      json = await SecureStore.getItemAsync(USER_SESSION_KEY);
    }

    if (!json) return null;
    const data = JSON.parse(json) as StoredUserSession;
    return data?.isLoggedIn ? data : null;
  } catch (error) {
    console.warn('[LocalStorage] Failed to read user session:', error);
    return null;
  }
}

/**
 * Checks whether a valid user session exists in local storage.
 */
export async function isLocallySignedIn(): Promise<boolean> {
  const session = await getLocalUserSession();
  return Boolean(session && session.isLoggedIn && session.uid);
}

/**
 * Clears the user session from local storage on logout.
 */
export async function clearLocalUserSession(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(USER_SESSION_KEY);
      }
      return;
    }
    await SecureStore.deleteItemAsync(USER_SESSION_KEY);
  } catch (error) {
    console.warn('[LocalStorage] Failed to clear user session:', error);
  }
}

