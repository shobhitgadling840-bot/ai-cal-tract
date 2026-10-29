import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useUser, useClerk } from '@clerk/clerk-expo';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import {
  syncUserToFirestore,
  getUserFirestoreProfile,
  UserFirestoreData,
} from '@/services/firebase';
import { FirebaseStatusBadge } from '@/components/FirebaseStatusBadge';
import {
  getLocalUserSession,
  saveLocalUserSession,
  clearLocalUserSession,
  StoredUserSession,
} from '@/utils/localStorage';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  const [firestoreData, setFirestoreData] = useState<UserFirestoreData | null>(
    null
  );
  const [localSession, setLocalSession] = useState<StoredUserSession | null>(
    null
  );
  const [syncing, setSyncing] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [retryingSync, setRetryingSync] = useState(false);
  const [showJsonInspector, setShowJsonInspector] = useState(false);

  const performSync = async () => {
    if (user) {
      setSyncing(true);
      setSyncError(null);
      try {
        const authProv = user.externalAccounts?.length ? 'google' : 'email_password';
        const syncResult = await syncUserToFirestore(user, authProv);

        // Persist user to LocalStorage
        await saveLocalUserSession({
          uid: user.id,
          email: user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || '',
          displayName:
            user.fullName ||
            user.firstName ||
            'Fitness Explorer',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          photoUrl: user.imageUrl || '',
          authProvider: authProv,
        });

        if (syncResult.success) {
          setSyncError(null);
          if (syncResult.data) {
            setFirestoreData(syncResult.data as UserFirestoreData);
          } else {
            const profile = await getUserFirestoreProfile(user.id);
            if (profile) setFirestoreData(profile);
          }
        } else {
          setSyncError(syncResult.error || 'Failed to sync with Firestore');
        }
      } catch (err: any) {
        console.error('Error during Firestore sync:', err);
        setSyncError(err?.message || 'Unexpected sync error');
      } finally {
        setSyncing(false);
        setRetryingSync(false);
      }
    }
  };

  useEffect(() => {
    async function initSession() {
      const stored = await getLocalUserSession();
      if (stored) {
        setLocalSession(stored);
      }

      if (user) {
        performSync();
      } else if (stored) {
        setSyncing(false);
        const profile = await getUserFirestoreProfile(stored.uid);
        if (profile) setFirestoreData(profile);
      } else {
        setSyncing(false);
        router.replace('/(auth)/sign-in');
      }
    }

    if (isLoaded) {
      initSession();
    }
  }, [user, isLoaded]);

  const handleRetrySync = () => {
    setRetryingSync(true);
    performSync();
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            // 1. Clear LocalStorage session
            await clearLocalUserSession();
            // 2. Sign out of Clerk
            if (signOut) {
              await signOut();
            }
          } catch (e) {
            console.log('Sign out note:', e);
          }
          router.replace('/(auth)/sign-in');
        },
      },
    ]);
  };

  const displayName =
    user?.fullName ||
    localSession?.displayName ||
    firestoreData?.displayName ||
    user?.firstName ||
    'Fitness Explorer';
  const displayEmail =
    user?.primaryEmailAddress?.emailAddress ||
    localSession?.email ||
    firestoreData?.email ||
    'user@aicaltrack.app';

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header / Profile Bar */}
        <View style={styles.headerBar}>
          <View style={styles.profileSection}>
            {user?.imageUrl ? (
              <Image
                source={{ uri: user.imageUrl }}
                style={styles.avatarImage}
              />
            ) : (
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.avatarFallback}
              >
                <Text style={styles.avatarInitial}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
            )}
            <View style={styles.profileTextCol}>
              <Text style={styles.welcomeGreeting}>Welcome to CalorieAI 👋</Text>
              <Text style={styles.profileName} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={styles.profileEmail} numberOfLines={1}>
                {displayEmail}
              </Text>
            </View>
          </View>

          <Pressable
            hitSlop={10}
            onPress={handleSignOut}
            style={styles.signOutButton}
          >
            <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          </Pressable>
        </View>

        {/* Firebase Firestore Sync Status Card */}
        <View style={styles.firestoreCard}>
          <View style={styles.firestoreHeader}>
            <View style={styles.firestoreTitleRow}>
              <Ionicons
                name="logo-firebase"
                size={20}
                color="#FFCA28"
              />
              <Text style={styles.firestoreCardTitle}>
                Firebase Firestore Status
              </Text>
            </View>
            <FirebaseStatusBadge
              synced={!syncing && !syncError}
              hasError={Boolean(syncError)}
              provider={user?.externalAccounts?.length ? 'Google' : 'Clerk'}
            />
          </View>

          {syncError ? (
            <View style={styles.syncErrorBox}>
              <View style={styles.syncErrorHeader}>
                <Ionicons name="warning-outline" size={18} color={Colors.warning} />
                <Text style={styles.syncErrorTitle}>
                  Firestore Rules Blocking Writes
                </Text>
              </View>
              <Text style={styles.syncErrorDesc}>
                Firebase returned &quot;permission-denied&quot;. Open Firebase Console &gt; Firestore Database &gt; Rules, and set:
              </Text>
              <View style={styles.rulesCodeBlock}>
                <Text style={styles.rulesCodeText}>
                  match /users/&#123;userId&#125; &#123; allow read, write: if true; &#125;
                </Text>
              </View>
              <Pressable
                onPress={handleRetrySync}
                disabled={retryingSync}
                style={styles.retrySyncBtn}
              >
                {retryingSync ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="refresh" size={14} color="#FFFFFF" />
                    <Text style={styles.retrySyncBtnText}>
                      Retry Firestore Save
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : (
            <Text style={styles.firestoreDesc}>
              User basic info, authentication metadata, and nutrition goals are
              saved in the <Text style={styles.highlightText}>users</Text> collection
              in Firestore (Doc ID: {user?.id || localSession?.uid || 'demo_user'}).
            </Text>
          )}

          {/* LocalStorage persistence badge */}
          <View style={styles.storagePill}>
            <Ionicons
              name="shield-checkmark-outline"
              size={13}
              color={Colors.primaryLight}
            />
            <Text style={styles.storagePillText}>
              Session Persisted in LocalStorage
            </Text>
          </View>

          {/* Toggle JSON Inspector */}
          <Pressable
            onPress={() => setShowJsonInspector(!showJsonInspector)}
            style={styles.inspectorToggle}
          >
            <Ionicons
              name={showJsonInspector ? 'chevron-up' : 'code-slash-outline'}
              size={14}
              color={Colors.primaryLight}
            />
            <Text style={styles.inspectorToggleText}>
              {showJsonInspector
                ? 'Hide Firestore Document JSON'
                : 'Inspect Saved Firestore Document'}
            </Text>
          </Pressable>

          {showJsonInspector ? (
            <View style={styles.jsonBox}>
              <Text style={styles.jsonText}>
                {JSON.stringify(
                  {
                    uid: user?.id || firestoreData?.uid,
                    email: displayEmail,
                    displayName,
                    photoUrl: user?.imageUrl || '',
                    authProvider: user?.externalAccounts?.length
                      ? 'google'
                      : 'email_password',
                    nutritionGoals: firestoreData?.nutritionGoals || {
                      dailyCalorieTarget: 2200,
                      proteinTargetGrams: 140,
                      carbsTargetGrams: 220,
                      fatTargetGrams: 65,
                      waterTargetMl: 2500,
                    },
                    lastSyncedAt: new Date().toISOString(),
                  },
                  null,
                  2
                )}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Dribbble Style Daily Calorie Tracker Summary */}
        <LinearGradient
          colors={['#17263E', '#101B2E']}
          style={styles.trackerHeroCard}
        >
          <View style={styles.trackerTopRow}>
            <View>
              <Text style={styles.trackerLabel}>TODAY'S CALORIE BUDGET</Text>
              <Text style={styles.caloriesNumber}>
                1,450 <Text style={styles.caloriesTarget}>/ 2,200 kcal</Text>
              </Text>
            </View>
            <View style={styles.flameIconWrapper}>
              <Image
                source={require('@/assets/images/fire.png')}
                style={styles.fireHeroImage}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarTrack}>
            <LinearGradient
              colors={['#10B981', '#34D399']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBarFill, { width: '66%' }]}
            />
          </View>
          <Text style={styles.remainingCaloriesText}>
            🔥 750 kcal remaining for dinner & snacks
          </Text>

          {/* Macros Split Cards */}
          <View style={styles.macrosRow}>
            <View style={styles.macroCard}>
              <Text style={styles.macroValue}>108g</Text>
              <Text style={styles.macroLabel}>Protein (77%)</Text>
              <View style={[styles.macroBar, { backgroundColor: '#3B82F6' }]} />
            </View>

            <View style={styles.macroCard}>
              <Text style={styles.macroValue}>162g</Text>
              <Text style={styles.macroLabel}>Carbs (73%)</Text>
              <View style={[styles.macroBar, { backgroundColor: '#F59E0B' }]} />
            </View>

            <View style={styles.macroCard}>
              <Text style={styles.macroValue}>44g</Text>
              <Text style={styles.macroLabel}>Fat (68%)</Text>
              <View style={[styles.macroBar, { backgroundColor: '#EC4899' }]} />
            </View>
          </View>
        </LinearGradient>

        {/* AI Meal Scanner & Water Intake Row */}
        <View style={styles.featuresRow}>
          {/* AI Scan Meal Card */}
          <LinearGradient
            colors={['#1E2C48', '#141E34']}
            style={styles.featureCard}
          >
            <View style={styles.featureIconBadge}>
              <Ionicons name="camera-outline" size={24} color={Colors.primaryLight} />
            </View>
            <Text style={styles.featureTitle}>Scan Meal with AI</Text>
            <Text style={styles.featureSubtitle}>
              Take a photo to automatically estimate calories & macros
            </Text>
            <View style={styles.featureActionPill}>
              <Text style={styles.featureActionText}>Try Scanner ✦</Text>
            </View>
          </LinearGradient>

          {/* Water Intake Card */}
          <LinearGradient
            colors={['#1E2C48', '#141E34']}
            style={styles.featureCard}
          >
            <View style={[styles.featureIconBadge, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
              <Ionicons name="water-outline" size={24} color="#06B6D4" />
            </View>
            <Text style={styles.featureTitle}>Water Hydration</Text>
            <Text style={styles.featureSubtitle}>
              1,750 / 2,500 ml logged today
            </Text>
            <View style={[styles.featureActionPill, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
              <Text style={[styles.featureActionText, { color: '#06B6D4' }]}>+250 ml Glass</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Streak and Stats Banner */}
        <View style={styles.streakCard}>
          <View style={styles.streakLeft}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.streakLogo}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.streakTitle}>AI Calorie Tracker</Text>
              <Text style={styles.streakSubtitle}>
                Clerk Auth + Firebase Firestore Active
              </Text>
            </View>
          </View>
          <View style={styles.activePill}>
            <Text style={styles.activePillText}>CONNECTED</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 40,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileTextCol: {
    flex: 1,
  },
  welcomeGreeting: {
    fontSize: 12,
    color: Colors.primaryLight,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  profileEmail: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  signOutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  firestoreCard: {
    backgroundColor: '#0F1829',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 20,
  },
  firestoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  firestoreTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  firestoreCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  firestoreDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  syncErrorBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  syncErrorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  syncErrorTitle: {
    color: Colors.warning,
    fontSize: 13,
    fontWeight: '700',
  },
  syncErrorDesc: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  rulesCodeBlock: {
    backgroundColor: '#070C15',
    borderRadius: 6,
    padding: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  rulesCodeText: {
    fontFamily: 'Courier',
    fontSize: 11,
    color: '#FCD34D',
  },
  retrySyncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  retrySyncBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  highlightText: {
    color: Colors.primaryLight,
    fontWeight: '700',
  },
  storagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  storagePillText: {
    fontSize: 11,
    color: Colors.primaryLight,
    fontWeight: '600',
  },
  inspectorToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  inspectorToggleText: {
    fontSize: 12,
    color: Colors.primaryLight,
    fontWeight: '600',
  },
  jsonBox: {
    backgroundColor: '#070C15',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  jsonText: {
    fontFamily: 'Courier',
    fontSize: 11,
    color: '#34D399',
    lineHeight: 16,
  },
  trackerHeroCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    marginBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  trackerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  trackerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  caloriesNumber: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  caloriesTarget: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  flameIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 100, 51, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 100, 51, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fireHeroImage: {
    width: 28,
    height: 28,
  },
  progressBarTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  remainingCaloriesText: {
    fontSize: 13,
    color: Colors.primaryLight,
    fontWeight: '600',
    marginBottom: 16,
  },
  macrosRow: {
    flexDirection: 'row',
    gap: 10,
  },
  macroCard: {
    flex: 1,
    backgroundColor: 'rgba(10, 16, 28, 0.7)',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  macroValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  macroLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    marginBottom: 6,
  },
  macroBar: {
    height: 3,
    borderRadius: 2,
    width: '80%',
  },
  featuresRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  featureCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'space-between',
  },
  featureIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  featureSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 15,
    marginBottom: 14,
  },
  featureActionPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  featureActionText: {
    color: Colors.primaryLight,
    fontSize: 11,
    fontWeight: '700',
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0C1322',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  streakLogo: {
    width: 32,
    height: 32,
  },
  streakTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  streakSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  activePill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  activePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primaryLight,
    letterSpacing: 0.5,
  },
});

