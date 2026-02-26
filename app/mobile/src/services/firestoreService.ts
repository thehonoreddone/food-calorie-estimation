// ─── Firebase Firestore Service ─────────────────────────────────────────────
// Prediction history & meal tracking stored in Cloud Firestore
// ────────────────────────────────────────────────────────────────────────────

import {
  collection,
  doc,
  addDoc,
  getDocs,
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
