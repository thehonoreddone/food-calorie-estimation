// ─── Firebase Firestore Service ─────────────────────────────────────────────
// Prediction history & meal tracking stored in Cloud Firestore
// ────────────────────────────────────────────────────────────────────────────

import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { PredictionResponse } from '../types';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FirestorePrediction {
  id?: string;
  uid: string;
  prediction: PredictionResponse;
  imageUri: string;
  timestamp: string;
  createdAt?: Timestamp;
}

// ─── Predictions Collection ─────────────────────────────────────────────────

const PREDICTIONS_COLLECTION = 'predictions';

/**
 * Save a prediction to Firestore
 */
export async function savePrediction(
  uid: string,
  prediction: PredictionResponse,
  imageUri: string
): Promise<string> {
  const docRef = await addDoc(collection(db, PREDICTIONS_COLLECTION), {
    uid,
    prediction,
    imageUri,
    timestamp: new Date().toISOString(),
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Get all predictions for a user (latest first)
 */
export async function getUserPredictions(
  uid: string,
  maxResults: number = 50
): Promise<FirestorePrediction[]> {
  const q = query(
    collection(db, PREDICTIONS_COLLECTION),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(maxResults)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as FirestorePrediction[];
}

/**
 * Delete a prediction
 */
export async function deletePrediction(predictionId: string): Promise<void> {
  await deleteDoc(doc(db, PREDICTIONS_COLLECTION, predictionId));
}

/**
 * Delete all predictions for a user
 */
export async function clearUserPredictions(uid: string): Promise<void> {
  const q = query(
    collection(db, PREDICTIONS_COLLECTION),
    where('uid', '==', uid)
  );

  const snapshot = await getDocs(q);
  const deletePromises = snapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
  await Promise.all(deletePromises);
}

// ─── Daily Meal Tracking ────────────────────────────────────────────────────

const MEALS_COLLECTION = 'daily_meals';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealEntry {
  id?: string;
  uid: string;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  weight: number;
  quantity?: number;   // porsiyon miktarı (adet, kase, vb.)
  unit?: string;       // 'gram' | 'adet' | 'ml' | 'kase'
  foodKey?: string;    // class_names.json key
  confidence?: number;
  imageUri?: string;
  createdAt?: Timestamp;
}

/**
 * Log a meal for today
 */
export async function logMeal(
  uid: string,
  meal: Omit<MealEntry, 'id' | 'uid' | 'createdAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, MEALS_COLLECTION), {
    uid,
    ...meal,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Get meals for a specific date
 */
export async function getMealsForDate(
  uid: string,
  date: string
): Promise<MealEntry[]> {
  const q = query(
    collection(db, MEALS_COLLECTION),
    where('uid', '==', uid),
    where('date', '==', date),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as MealEntry[];
}

/**
 * Delete a meal entry
 */
export async function deleteMeal(mealId: string): Promise<void> {
  await deleteDoc(doc(db, MEALS_COLLECTION, mealId));
}

/**
 * Update a meal entry (for quantity adjustments, etc.)
 */
export async function updateMeal(
  mealId: string,
  updates: Partial<Omit<MealEntry, 'id' | 'uid' | 'createdAt'>>
): Promise<void> {
  await updateDoc(doc(db, MEALS_COLLECTION, mealId), updates);
}

// ─── Exercise Tracking ──────────────────────────────────────────────────────

const EXERCISES_COLLECTION = 'daily_exercises';

export interface ExerciseEntry {
  id?: string;
  uid: string;
  date: string; // YYYY-MM-DD
  name: string;
  duration: number; // minutes
  caloriesBurned: number;
  createdAt?: Timestamp;
}

/**
 * Log an exercise
 */
export async function logExercise(
  uid: string,
  exercise: Omit<ExerciseEntry, 'id' | 'uid' | 'createdAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, EXERCISES_COLLECTION), {
    uid,
    ...exercise,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Get exercises for a specific date
 */
export async function getExercisesForDate(
  uid: string,
  date: string
): Promise<ExerciseEntry[]> {
  const q = query(
    collection(db, EXERCISES_COLLECTION),
    where('uid', '==', uid),
    where('date', '==', date),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as ExerciseEntry[];
}

/**
 * Delete an exercise entry
 */
export async function deleteExercise(exerciseId: string): Promise<void> {
  await deleteDoc(doc(db, EXERCISES_COLLECTION, exerciseId));
}

// ─── Weight Tracking ────────────────────────────────────────────────────────

const WEIGHT_COLLECTION = 'weight_entries';

export interface WeightEntry {
  id?: string;
  uid: string;
  weight: number;       // kg
  date: string;         // YYYY-MM-DD
  createdAt?: Timestamp;
}

/**
 * Log a weight entry
 */
export async function logWeight(
  uid: string,
  weight: number,
  date?: string
): Promise<string> {
  const dateKey = date ?? new Date().toISOString().split('T')[0];
  // Upsert: one entry per day
  const existingQ = query(
    collection(db, WEIGHT_COLLECTION),
    where('uid', '==', uid),
    where('date', '==', dateKey)
  );
  const existing = await getDocs(existingQ);
  if (!existing.empty) {
    const docId = existing.docs[0].id;
    await updateDoc(doc(db, WEIGHT_COLLECTION, docId), { weight, createdAt: serverTimestamp() });
    return docId;
  }
  const docRef = await addDoc(collection(db, WEIGHT_COLLECTION), {
    uid,
    weight,
    date: dateKey,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Get weight entries for a user (ordered by date desc)
 * NOTE: Uses client-side sorting to avoid requiring a Firestore composite index.
 */
export async function getWeightEntries(
  uid: string,
  maxResults: number = 90
): Promise<WeightEntry[]> {
  const q = query(
    collection(db, WEIGHT_COLLECTION),
    where('uid', '==', uid),
    limit(maxResults)
  );
  const snapshot = await getDocs(q);
  const entries = snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as WeightEntry[];
  // Sort client-side by date descending
  entries.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
  return entries;
}

/**
 * Get latest weight entry
 */
export async function getLatestWeight(uid: string): Promise<WeightEntry | null> {
  const entries = await getWeightEntries(uid, 1);
  return entries.length > 0 ? entries[0] : null;
}

// ─── Achievements / Badges ──────────────────────────────────────────────────

const ACHIEVEMENTS_COLLECTION = 'user_achievements';
const APP_OPENS_COLLECTION = 'app_opens';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'meal_streak' | 'login_streak' | 'special';
  requiredDays: number;
  unlockedAt?: string;  // ISO date when unlocked
}

export interface UserAchievements {
  uid: string;
  mealStreakCurrent: number;
  mealStreakBest: number;
  loginStreakCurrent: number;
  loginStreakBest: number;
  totalMealDays: number;
  totalLoginDays: number;
  unlockedBadges: string[]; // achievement ids
  lastMealDate?: string;
  lastLoginDate?: string;
  updatedAt?: Timestamp;
}

/** All available achievements */
export const ALL_ACHIEVEMENTS: Achievement[] = [
  // Meal logging streaks
  { id: 'meal_7', title: '1 Hafta Kayıt', description: '7 gün boyunca yemek kaydettiniz!', icon: '🥉', type: 'meal_streak', requiredDays: 7 },
  { id: 'meal_15', title: '15 Gün Kayıt', description: '15 gün boyunca yemek kaydettiniz!', icon: '🥈', type: 'meal_streak', requiredDays: 15 },
  { id: 'meal_30', title: '1 Ay Kayıt', description: '30 gün boyunca yemek kaydettiniz!', icon: '🥇', type: 'meal_streak', requiredDays: 30 },
  { id: 'meal_60', title: '2 Ay Kayıt', description: '60 gün boyunca yemek kaydettiniz!', icon: '🏆', type: 'meal_streak', requiredDays: 60 },
  { id: 'meal_90', title: '3 Ay Kayıt', description: '90 gün boyunca yemek kaydettiniz!', icon: '💎', type: 'meal_streak', requiredDays: 90 },
  // Login streaks
  { id: 'login_7', title: '1 Hafta Giriş', description: '7 gün art arda giriş yaptınız!', icon: '🔥', type: 'login_streak', requiredDays: 7 },
  { id: 'login_15', title: '15 Gün Giriş', description: '15 gün art arda giriş yaptınız!', icon: '⚡', type: 'login_streak', requiredDays: 15 },
  { id: 'login_30', title: '1 Ay Giriş', description: '30 gün art arda giriş yaptınız!', icon: '🌟', type: 'login_streak', requiredDays: 30 },
  { id: 'login_60', title: '2 Ay Giriş', description: '60 gün art arda giriş yaptınız!', icon: '👑', type: 'login_streak', requiredDays: 60 },
  // Special
  { id: 'first_meal', title: 'İlk Kayıt', description: 'İlk yemek kaydınızı oluşturdunuz!', icon: '🎉', type: 'special', requiredDays: 1 },
  { id: 'first_scan', title: 'İlk Tarama', description: 'İlk yemek taramanızı yaptınız!', icon: '📸', type: 'special', requiredDays: 1 },
];

/**
 * Get or create user achievements document
 */
export async function getUserAchievements(uid: string): Promise<UserAchievements> {
  const docRef = doc(db, ACHIEVEMENTS_COLLECTION, uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as UserAchievements;
  }
  const initial: UserAchievements = {
    uid,
    mealStreakCurrent: 0,
    mealStreakBest: 0,
    loginStreakCurrent: 0,
    loginStreakBest: 0,
    totalMealDays: 0,
    totalLoginDays: 0,
    unlockedBadges: [],
  };
  await setDoc(docRef, { ...initial, updatedAt: serverTimestamp() });
  return initial;
}

/**
 * Record an app open (for login streak tracking)
 */
export async function recordAppOpen(uid: string): Promise<UserAchievements> {
  const today = new Date().toISOString().split('T')[0];
  const achievements = await getUserAchievements(uid);

  if (achievements.lastLoginDate === today) {
    return achievements; // Already recorded today
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().split('T')[0];

  let newLoginStreak = 1;
  if (achievements.lastLoginDate === yesterdayKey) {
    newLoginStreak = achievements.loginStreakCurrent + 1;
  }

  const newBest = Math.max(achievements.loginStreakBest, newLoginStreak);
  const newTotal = achievements.totalLoginDays + 1;

  // Check for new login badges
  const newBadges = [...achievements.unlockedBadges];
  for (const a of ALL_ACHIEVEMENTS) {
    if (a.type === 'login_streak' && newLoginStreak >= a.requiredDays && !newBadges.includes(a.id)) {
      newBadges.push(a.id);
    }
  }

  const updated: Partial<UserAchievements> = {
    loginStreakCurrent: newLoginStreak,
    loginStreakBest: newBest,
    totalLoginDays: newTotal,
    lastLoginDate: today,
    unlockedBadges: newBadges,
  };

  await setDoc(doc(db, ACHIEVEMENTS_COLLECTION, uid), { ...updated, updatedAt: serverTimestamp() }, { merge: true });
  return { ...achievements, ...updated };
}

/**
 * Record a meal log (for meal streak tracking)
 */
export async function recordMealLog(uid: string): Promise<UserAchievements> {
  const today = new Date().toISOString().split('T')[0];
  const achievements = await getUserAchievements(uid);

  if (achievements.lastMealDate === today) {
    return achievements; // Already recorded today
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().split('T')[0];

  let newMealStreak = 1;
  if (achievements.lastMealDate === yesterdayKey) {
    newMealStreak = achievements.mealStreakCurrent + 1;
  }

  const newBest = Math.max(achievements.mealStreakBest, newMealStreak);
  const newTotal = achievements.totalMealDays + 1;

  // Check for new meal badges
  const newBadges = [...achievements.unlockedBadges];
  for (const a of ALL_ACHIEVEMENTS) {
    if (a.type === 'meal_streak' && newMealStreak >= a.requiredDays && !newBadges.includes(a.id)) {
      newBadges.push(a.id);
    }
  }
  // Check first meal badge
  if (newTotal === 1 && !newBadges.includes('first_meal')) {
    newBadges.push('first_meal');
  }

  const updated: Partial<UserAchievements> = {
    mealStreakCurrent: newMealStreak,
    mealStreakBest: newBest,
    totalMealDays: newTotal,
    lastMealDate: today,
    unlockedBadges: newBadges,
  };

  await setDoc(doc(db, ACHIEVEMENTS_COLLECTION, uid), { ...updated, updatedAt: serverTimestamp() }, { merge: true });
  return { ...achievements, ...updated };
}

// ─── Daily Health Data (Steps & Sleep & Water) ──────────────────────────────

const HEALTH_DATA_COLLECTION = 'daily_health';

export interface DailyHealthData {
  id?: string;
  uid: string;
  date: string; // YYYY-MM-DD
  steps: number;
  stepsGoal: number;
  sleepMinutes: number;
  sleepHours: number;
  sleepMins: number;
  waterMl: number;
  waterGoal: number;
  updatedAt?: Timestamp;
}

export async function saveDailyHealth(
  uid: string,
  date: string,
  data: Partial<Omit<DailyHealthData, 'id' | 'uid' | 'date' | 'updatedAt'>>
): Promise<string> {
  const docId = `${uid}_${date}`;
  const docRef = doc(db, HEALTH_DATA_COLLECTION, docId);
  await setDoc(docRef, {
    uid,
    date,
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return docId;
}

export async function getDailyHealth(
  uid: string,
  date: string
): Promise<DailyHealthData | null> {
  const docId = `${uid}_${date}`;
  const docRef = doc(db, HEALTH_DATA_COLLECTION, docId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as DailyHealthData;
  }
  return null;
}

export async function updateWaterIntake(
  uid: string,
  date: string,
  waterMl: number
): Promise<void> {
  await saveDailyHealth(uid, date, { waterMl });
}
