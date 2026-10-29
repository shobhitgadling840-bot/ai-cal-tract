import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  Firestore,
} from 'firebase/firestore';

// Helper to sanitize environment variables (stripping accidental quotes, commas, spaces)
const cleanEnv = (val?: string) =>
  (val || '')
    .trim()
    .replace(/^["']|["'],?$/g, '')
    .replace(/,$/, '');

// Firebase configuration from Expo public environment variables
const firebaseConfig = {
  apiKey: cleanEnv(process.env.EXPO_PUBLIC_FIREBASE_API_KEY),
  authDomain: cleanEnv(process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: cleanEnv(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: cleanEnv(process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: cleanEnv(process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: cleanEnv(process.env.EXPO_PUBLIC_FIREBASE_APP_ID),
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  !firebaseConfig.apiKey.includes('YOUR_')
);

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
  } catch (error) {
    console.warn('[Firebase] Initialization error:', error);
  }
} else {
  // Initialize placeholder for development/preview without crashing
  try {
    const fallbackConfig = {
      apiKey: 'AIzaSyPlaceholderForLocalDevPreview123456',
      authDomain: 'ai-cal-track-demo.firebaseapp.com',
      projectId: 'ai-cal-track-demo',
      storageBucket: 'ai-cal-track-demo.appspot.com',
      messagingSenderId: '100000000000',
      appId: '1:100000000000:web:abcdef0123456789',
    };
    app = !getApps().length ? initializeApp(fallbackConfig) : getApp();
    db = getFirestore(app);
  } catch {
    // Silently continue in local demo mode
  }
}

export { app, db };

export interface UserNutritionGoals {
  dailyCalorieTarget: number;
  proteinTargetGrams: number;
  carbsTargetGrams: number;
  fatTargetGrams: number;
  waterTargetMl: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete';
  fitnessGoal: 'weight_loss' | 'muscle_gain' | 'maintain' | 'clean_eating';
}

export interface UserFirestoreData {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  photoUrl: string;
  authProvider: 'email_password' | 'google' | 'clerk';
  createdAt: any;
  lastLoginAt: any;
  nutritionGoals: UserNutritionGoals;
  stats: {
    streakDays: number;
    mealsLoggedTotal: number;
    caloriesBurnedEstimated: number;
  };
}

export interface ClerkUserLike {
  id: string;
  primaryEmailAddress?: { emailAddress: string } | null;
  emailAddresses?: Array<{ emailAddress: string }>;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  imageUrl?: string | null;
}

/**
 * Saves or updates basic user information in Firebase Firestore database
 * after successful Sign In or Sign Up via Clerk.
 * If user document does not exist, creates a full initial user profile.
 * If it already exists, updates lastLoginAt without overwriting custom goals.
 */
export async function syncUserToFirestore(
  user: ClerkUserLike,
  provider: 'email_password' | 'google' | 'clerk' = 'clerk'
): Promise<{
  success: boolean;
  data?: Partial<UserFirestoreData>;
  error?: string;
  isNewUser?: boolean;
}> {
  const email =
    user.primaryEmailAddress?.emailAddress ||
    user.emailAddresses?.[0]?.emailAddress ||
    '';
  const firstName = user.firstName || '';
  const lastName = user.lastName || '';
  const displayName =
    user.fullName ||
    (firstName ? `${firstName} ${lastName}`.trim() : email ? email.split('@')[0] : 'Fitness Explorer');
  const photoUrl = user.imageUrl || '';

  if (!db || !isFirebaseConfigured) {
    console.warn('[Firebase] Firestore is not configured with live credentials.');
    return {
      success: false,
      error: 'Firebase Firestore is not initialized. Please verify your environment variables.',
    };
  }

  const userId = user.id;
  if (!userId) {
    return {
      success: false,
      error: 'Missing user ID for Firestore synchronization.',
    };
  }

  const userDocRef = doc(db, 'users', userId);

  try {
    // 1. Check if user document already exists in Firestore
    let existingDocSnap = null;
    try {
      existingDocSnap = await getDoc(userDocRef);
    } catch (readErr: any) {
      console.warn('[Firebase] Check existing doc read error:', readErr?.message);
    }

    if (!existingDocSnap || !existingDocSnap.exists()) {
      // User does NOT exist in Firebase Firestore yet -> Create new user profile!
      const initialUserData: Record<string, any> = {
        uid: userId,
        email,
        firstName,
        lastName,
        displayName,
        photoUrl,
        authProvider: provider,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        nutritionGoals: {
          dailyCalorieTarget: 2200,
          proteinTargetGrams: 140,
          carbsTargetGrams: 220,
          fatTargetGrams: 65,
          waterTargetMl: 2500,
          activityLevel: 'moderate',
          fitnessGoal: 'maintain',
        },
        stats: {
          streakDays: 1,
          mealsLoggedTotal: 0,
          caloriesBurnedEstimated: 0,
        },
      };

      await setDoc(userDocRef, initialUserData);
      console.log(`[Firebase] SUCCESS: Created new user document in Firestore: users/${userId}`);

      return {
        success: true,
        isNewUser: true,
        data: initialUserData as any,
      };
    } else {
      // User ALREADY exists in Firestore -> Update last login time and basic info only
      const updateData: Record<string, any> = {
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        displayName: displayName || existingDocSnap.data()?.displayName,
        photoUrl: photoUrl || existingDocSnap.data()?.photoUrl,
        email: email || existingDocSnap.data()?.email,
      };

      await setDoc(userDocRef, updateData, { merge: true });
      console.log(`[Firebase] SUCCESS: Updated existing user document in Firestore: users/${userId}`);

      return {
        success: true,
        isNewUser: false,
        data: {
          ...existingDocSnap.data(),
          ...updateData,
        } as any,
      };
    }
  } catch (error: any) {
    console.error('[Firebase] Failed to write to Firestore:', error);
    let errorMessage = error?.message || 'Failed to sync user with Firestore database';

    if (error?.code === 'permission-denied') {
      errorMessage =
        'Firestore Permission Denied: Your Firestore Security Rules currently reject writes. Please set "allow read, write: if true;" in Firebase Console > Firestore Database > Rules.';
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Fetches user profile from Firestore
 */
export async function getUserFirestoreProfile(
  userId: string
): Promise<UserFirestoreData | null> {
  if (!db || !isFirebaseConfigured) return null;
  try {
    const userDocRef = doc(db, 'users', userId);
    const snapshot = await getDoc(userDocRef);
    if (snapshot.exists()) {
      return snapshot.data() as UserFirestoreData;
    }
    return null;
  } catch (error) {
    console.error('[Firebase] Error fetching user profile:', error);
    return null;
  }
}

