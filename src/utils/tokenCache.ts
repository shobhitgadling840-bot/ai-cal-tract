import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { TokenCache } from '@clerk/clerk-expo';

export const createTokenCache = (): TokenCache => {
  return {
    getToken: async (key: string) => {
      try {
        if (Platform.OS === 'web') {
          return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
        }
        return await SecureStore.getItemAsync(key);
      } catch (err) {
        console.warn('Error reading from SecureStore token cache:', err);
        return null;
      }
    },
    saveToken: async (key: string, value: string) => {
      try {
        if (Platform.OS === 'web') {
          if (typeof window !== 'undefined') {
            localStorage.setItem(key, value);
          }
          return;
        }
        await SecureStore.setItemAsync(key, value);
      } catch (err) {
        console.warn('Error saving to SecureStore token cache:', err);
      }
    },
    clearToken: async (key: string) => {
      try {
        if (Platform.OS === 'web') {
          if (typeof window !== 'undefined') {
            localStorage.removeItem(key);
          }
          return;
        }
        await SecureStore.deleteItemAsync(key);
      } catch (err) {
        console.warn('Error clearing key from SecureStore:', err);
      }
    },
  };
};

export const tokenCache = createTokenCache();

