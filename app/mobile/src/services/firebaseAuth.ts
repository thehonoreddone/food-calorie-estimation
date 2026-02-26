// ─── Firebase Auth Service ──────────────────────────────────────────────────
// Email/Password authentication via Firebase Auth
// Email doğrulama + şifre sıfırlama dahil
// ────────────────────────────────────────────────────────────────────────────

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
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
  birthDate?: string; // ISO date YYYY-MM-DD
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
 * Firebase hata kodlarını kullanıcı dostu Türkçe mesajlara çevirir
 */
export function getFirebaseErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Bu e-posta adresi zaten kullanımda.';
    case 'auth/invalid-email':
      return 'Geçersiz e-posta adresi.';
    case 'auth/weak-password':
      return 'Şifre çok zayıf. En az 6 karakter kullanın.';
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
      return 'E-posta veya şifre hatalı.';
    case 'auth/wrong-password':
      return 'Şifre hatalı.';
    case 'auth/too-many-requests':
      return 'Çok fazla deneme yapıldı. Lütfen biraz bekleyin.';
    case 'auth/user-disabled':
      return 'Bu hesap devre dışı bırakılmış.';
    case 'auth/network-request-failed':
      return 'İnternet bağlantınızı kontrol edin.';
    default:
      return 'Bir hata oluştu. Lütfen tekrar deneyin.';
  }
}

/**
 * Register a new user with email/password
 * Sends email verification and creates Firestore profile
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

  // Send verification email
  try {
    await sendEmailVerification(user);
  } catch (verifyErr) {
    console.warn('Email verification could not be sent:', verifyErr);
  }

  // Create user profile in Firestore (wrapped in try-catch so auth user isn't lost)
  try {
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      name,
      email,
      emailVerified: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (firestoreErr) {
    console.warn('Firestore profile creation failed (will retry on next login):', firestoreErr);
  }

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
  const user = credential.user;

  // Sync email verification status to Firestore
  try {
    await setDoc(
      doc(db, 'users', user.uid),
      {
        emailVerified: user.emailVerified,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch {
    // Non-critical — ignore
  }

  return user;
}

/**
 * Resend verification email (e.g. if user didn't receive it)
 */
export async function resendVerificationEmail(): Promise<void> {
  const user = auth.currentUser;
  if (user && !user.emailVerified) {
    await sendEmailVerification(user);
  }
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
  // Firestore does not accept undefined values - filter them out
  const cleanUpdates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      cleanUpdates[key] = value;
    }
  }
  cleanUpdates.updatedAt = serverTimestamp();

  await setDoc(
    doc(db, 'users', uid),
    cleanUpdates,
    { merge: true }
  );
}
