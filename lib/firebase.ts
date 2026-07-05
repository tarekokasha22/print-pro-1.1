// lib/firebase.ts — Firebase config & Auth helpers for Print Pro
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User,
} from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBvhVMmYMjKPpr_ZpRhFg9A4_V-DfeKRfQ",
  authDomain: "print-pro1.firebaseapp.com",
  projectId: "print-pro1",
  storageBucket: "print-pro1.firebasestorage.app",
  messagingSenderId: "413428582670",
  appId: "1:413428582670:web:57d4f670580ef6bd32ef5f",
  measurementId: "G-4383XJYYDB",
};

// Prevent duplicate initialization in Next.js hot reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Analytics — only in browser
if (typeof window !== "undefined") {
  isSupported().then((yes) => {
    if (yes) getAnalytics(app);
  });
}

// ─── Auth helpers ────────────────────────────────────────────────────────────

/** Register with email & password */
export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<{ user: User | null; error: string | null }> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    return { user: cred.user, error: null };
  } catch (err: unknown) {
    return { user: null, error: getFirebaseError(err) };
  }
}

/** Sign in with email & password */
export async function loginWithEmail(
  email: string,
  password: string
): Promise<{ user: User | null; error: string | null }> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return { user: cred.user, error: null };
  } catch (err: unknown) {
    return { user: null, error: getFirebaseError(err) };
  }
}

/** Sign in with Google popup */
export async function loginWithGoogle(): Promise<{
  user: User | null;
  error: string | null;
}> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    return { user: cred.user, error: null };
  } catch (err: unknown) {
    return { user: null, error: getFirebaseError(err) };
  }
}

/** Sign out */
export async function logout() {
  await signOut(auth);
}

/** Subscribe to auth state */
export { onAuthStateChanged };

// ─── Error messages (Arabic) ─────────────────────────────────────────────────
function getFirebaseError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  const messages: Record<string, string> = {
    "auth/email-already-in-use": "البريد الإلكتروني مستخدم بالفعل",
    "auth/invalid-email": "البريد الإلكتروني غير صالح",
    "auth/weak-password": "كلمة المرور ضعيفة (6 أحرف على الأقل)",
    "auth/user-not-found": "البريد الإلكتروني غير مسجل",
    "auth/wrong-password": "كلمة المرور غير صحيحة",
    "auth/invalid-credential": "البريد الإلكتروني أو كلمة المرور غير صحيحة",
    "auth/too-many-requests": "محاولات كثيرة، حاول لاحقاً",
    "auth/popup-closed-by-user": "تم إغلاق نافذة تسجيل الدخول",
    "auth/network-request-failed": "خطأ في الشبكة، تحقق من اتصالك",
  };
  return messages[code] ?? "حدث خطأ غير متوقع، حاول مرة أخرى";
}
