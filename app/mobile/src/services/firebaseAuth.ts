// ─── Firebase Auth Service ──────────────────────────────────────────────────
// Email/Password authentication via Firebase Auth
// ────────────────────────────────────────────────────────────────────────────

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  sendPasswordResetEmail,
  User,
  UserCredential,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export interface FirebaseUserProfile {
  uid: string;
  name: string;
  email: string;
  avatarUri?: string;
  gender?: string;
  age?: number;
  height?: number;
  weight?: number;
  goal?: string;
  activityLevel?: string;
  dietPreferences?: string[];
  dailyCalorieTarget?: number;
  notificationsEnabled?: boolean;
  mealReminders?: boolean;
  weeklyReport?: boolean;
  createdAt?: ReturnType<typeof serverTimestamp>;
  updatedAt?: ReturnType<typeof serverTimestamp>;
}

// ─── Auth Functions ──────────────────────────────────────────────────────────

/**
 * Register a new user with email/password
 * Also creates a Firestore user profile document
 */
export async function firebaseRegister(
  name: string,
  email: string,
  password: string
): Promise<User> {
  const credential: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  // Set display name
  await updateProfile(user, { displayName: name });

  // Create user profile in Firestore
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    name,
    email,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return user;
}

/**
 * Login with email/password
 */
export async function firebaseLogin(
  email: string,
  password: string
): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

/**
 * Logout the current user
 */
export async function firebaseLogout(): Promise<void> {
  await signOut(auth);
}

/**
 * Get current Firebase user (null if not signed in)
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

/**
 * Listen to auth state changes
 * Returns unsubscribe function
 */
export function onAuthChanged(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

/**
 * Send password reset email
 */
export async function firebaseResetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

// ─── Firestore Profile Functions ─────────────────────────────────────────────

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(uid: string): Promise<FirebaseUserProfile | null> {
  const docSnap = await getDoc(doc(db, 'users', uid));
  if (docSnap.exists()) {
    return docSnap.data() as FirebaseUserProfile;
  }
  return null;
}

/**
 * Update user profile in Firestore
 */
export async function updateUserProfile(
  uid: string,
  updates: Partial<FirebaseUserProfile>
): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    { ...updates, updatedAt: serverTimestamp() },
    { merge: true }
  );
}
