import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  firebaseLogin,
  firebaseRegister,
  firebaseLogout,
  getCurrentUser,
  getUserProfile,
  updateUserProfile,
  onAuthChanged,
  getFirebaseErrorMessage,
} from '../services/firebaseAuth';

// ─── Types ──────────────────────────────────────────────────────────────────

export type Gender = 'male' | 'female' | 'other';
export type Goal = 'lose' | 'maintain' | 'gain';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';
export type DietPreference = 'standard' | 'vegetarian' | 'vegan' | 'diet';

export interface UserProfile {
  uid?: string;
  name?: string;
  email?: string;
  avatarUri?: string;
  gender?: Gender;
  age?: number;
  birthDate?: string; // ISO date string YYYY-MM-DD
  height?: number; // cm
  weight?: number; // kg
  goal?: Goal;
  activityLevel?: ActivityLevel;
  dietPreferences?: DietPreference[];
  dailyCalorieTarget?: number;
  notificationsEnabled?: boolean;
  mealReminders?: boolean;
  weeklyReport?: boolean;
}

interface UserState {
  hasCompletedOnboarding: boolean;
  isAuthenticated: boolean;
  profile: UserProfile;
  isLoading: boolean;
}

interface UserContextType extends UserState {
  updateProfile: (updates: Partial<UserProfile>) => void;
  completeOnboarding: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  calculateDailyCalories: () => number;
  initializeState: () => Promise<void>;
}

// ─── Storage Keys ───────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  ONBOARDING_COMPLETE: '@nutrino_onboarding_complete',
  USER_PROFILE: '@nutrino_user_profile',
} as const;

// ─── Context ────────────────────────────────────────────────────────────────

const UserContext = createContext<UserContextType | undefined>(undefined);

// ─── Provider ───────────────────────────────────────────────────────────────

export function UserProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UserState>({
    hasCompletedOnboarding: false,
    isAuthenticated: false,
    profile: {},
    isLoading: true,
  });

  // Called once from _layout.tsx on mount (no useEffect)
  const initializeState = useCallback(async () => {
    try {
      // Check onboarding status from local storage
      const onboardingComplete = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);

      // Check Firebase auth state
      const firebaseUser = getCurrentUser();

      if (firebaseUser) {
        // User is signed in — try to load profile from Firestore
        let firestoreProfile = null;
        try {
          firestoreProfile = await getUserProfile(firebaseUser.uid);
        } catch (fsErr) {
          console.warn('Firestore profile load failed (using local only):', fsErr);
        }

        const localProfileRaw = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
        const localProfile: UserProfile = localProfileRaw
          ? (JSON.parse(localProfileRaw) as UserProfile)
          : {};

        // Merge: Firestore takes priority, local fills gaps
        const rawMerge = {
          ...localProfile,
          ...(firestoreProfile ?? {}),
          uid: firebaseUser.uid,
          name: firestoreProfile?.name ?? firebaseUser.displayName ?? localProfile.name,
          email: firestoreProfile?.email ?? firebaseUser.email ?? localProfile.email,
        };
        // Strip Firestore-only fields & cast union types
        const { createdAt: _c, updatedAt: _u, ...profileFields } = rawMerge as Record<string, unknown>;
        const mergedProfile = profileFields as UserProfile;

        // Cache locally
        await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(mergedProfile));

        setState({
          hasCompletedOnboarding: onboardingComplete === 'true',
          isAuthenticated: true,
          profile: mergedProfile,
          isLoading: false,
        });
      } else {
        // Not signed in — load local profile only
        const profileData = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
        const parsedProfile: UserProfile = profileData
          ? (JSON.parse(profileData) as UserProfile)
          : {};

        setState({
          hasCompletedOnboarding: onboardingComplete === 'true',
          isAuthenticated: false,
          profile: parsedProfile,
          isLoading: false,
        });
      }

      // Listen for future auth state changes
      onAuthChanged((user) => {
        if (user) {
          setState(prev => ({
            ...prev,
            isAuthenticated: true,
            profile: {
              ...prev.profile,
              uid: user.uid,
              name: user.displayName ?? prev.profile.name,
              email: user.email ?? prev.profile.email,
            },
          }));
        } else {
          setState(prev => ({
            ...prev,
            isAuthenticated: false,
            profile: { ...prev.profile, uid: undefined },
          }));
        }
      });
    } catch (error) {
      console.error('Error loading user state:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setState(prev => {
      const newProfile = { ...prev.profile, ...updates };

      // Save locally
      AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(newProfile)).catch(console.error);

      // Sync to Firestore if user is authenticated
      const uid = newProfile.uid;
      if (uid) {
        updateUserProfile(uid, updates).catch(console.error);
      }

      return { ...prev, profile: newProfile };
    });
  }, []);

  const completeOnboarding = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
    setState(prev => ({ ...prev, hasCompletedOnboarding: true }));
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const user = await firebaseLogin(email, password);

      // Load Firestore profile (non-critical if it fails)
      let firestoreProfile = null;
      try {
        firestoreProfile = await getUserProfile(user.uid);
      } catch (fsErr) {
        console.warn('Firestore profile load after login failed:', fsErr);
      }

      const localRaw = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      const localProfile: UserProfile = localRaw ? (JSON.parse(localRaw) as UserProfile) : {};

      const rawMerge = {
        ...localProfile,
        ...(firestoreProfile ?? {}),
        uid: user.uid,
        name: firestoreProfile?.name ?? user.displayName ?? localProfile.name,
        email: user.email ?? localProfile.email,
      };
      const { createdAt: _c2, updatedAt: _u2, ...profileFields2 } = rawMerge as Record<string, unknown>;
      const mergedProfile = profileFields2 as UserProfile;

      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(mergedProfile));

      setState(prev => ({
        ...prev,
        isAuthenticated: true,
        profile: mergedProfile,
      }));
      return { success: true };
    } catch (error) {
      console.warn('Firebase login error:', (error as {code?: string})?.code);
      return { success: false, error: getFirebaseErrorMessage(error) };
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const user = await firebaseRegister(name, email, password);

      // Load full profile from Firestore and merge with local (non-critical)
      let firestoreProfile = null;
      try {
        firestoreProfile = await getUserProfile(user.uid);
      } catch (fsErr) {
        console.warn('Firestore profile load after register failed:', fsErr);
      }

      const existingRaw = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      const existing: UserProfile = existingRaw ? (JSON.parse(existingRaw) as UserProfile) : {};

      const rawMerge = {
        ...existing,
        ...(firestoreProfile ?? {}),
        uid: user.uid,
        name: firestoreProfile?.name ?? name,
        email: user.email ?? email,
      };
      const { createdAt: _c3, updatedAt: _u3, ...profileFields3 } = rawMerge as Record<string, unknown>;
      const mergedProfile = profileFields3 as UserProfile;

      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(mergedProfile));

      // Auto-login after registration
      setState(prev => ({
        ...prev,
        isAuthenticated: true,
        profile: mergedProfile,
      }));

      return { success: true };
    } catch (error) {
      console.warn('Firebase register error:', (error as {code?: string})?.code);
      return { success: false, error: getFirebaseErrorMessage(error) };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await firebaseLogout();
    } catch (error) {
      console.error('Firebase logout error:', error);
    }
    setState(prev => ({ ...prev, isAuthenticated: false }));
  }, []);

  const calculateDailyCalories = useCallback((): number => {
    const { gender, age, birthDate, height, weight, goal, activityLevel } = state.profile;
    // Derive age from birthDate if available, fallback to stored age
    let effectiveAge = age;
    if (birthDate) {
      const bd = new Date(birthDate);
      const today = new Date();
      let calcAge = today.getFullYear() - bd.getFullYear();
      const monthDiff = today.getMonth() - bd.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < bd.getDate())) {
        calcAge--;
      }
      effectiveAge = calcAge;
    }
    if (!gender || !effectiveAge || !height || !weight) return 2000;

    let bmr: number;
    if (gender === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * effectiveAge + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * effectiveAge - 161;
    }

    const multipliers: Record<ActivityLevel, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
    };
    const tdee = bmr * (multipliers[activityLevel ?? 'moderate']);

    switch (goal) {
      case 'lose': return Math.round(tdee - 500);
      case 'gain': return Math.round(tdee + 300);
      default: return Math.round(tdee);
    }
  }, [state.profile]);

  return (
    <UserContext.Provider
      value={{
        ...state,
        updateProfile,
        completeOnboarding,
        login,
        register,
        logout,
        calculateDailyCalories,
        initializeState,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
