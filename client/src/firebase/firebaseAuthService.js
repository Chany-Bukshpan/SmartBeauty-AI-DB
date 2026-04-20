import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { firebaseAuth, googleProvider } from "./firebaseClient";

export async function loginWithGooglePopup() {
  const cred = await signInWithPopup(firebaseAuth, googleProvider);
  return cred.user;
}

/** popup; אם הדפדפן חוסם — מעבר מלא לדף Google (חוזרים עם getRedirectResult) */
export async function loginWithGooglePreferred() {
  try {
    const cred = await signInWithPopup(firebaseAuth, googleProvider);
    return cred.user;
  } catch (e) {
    if (e?.code === "auth/popup-blocked") {
      await signInWithRedirect(firebaseAuth, googleProvider);
      return null;
    }
    throw e;
  }
}

export async function consumeGoogleRedirectResult() {
  const cred = await getRedirectResult(firebaseAuth);
  return cred?.user ?? null;
}

export async function loginWithFirebaseEmail(email, password) {
  const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
  return cred.user;
}

export async function registerFirebaseEmail(email, password) {
  const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
  return cred.user;
}

export async function resetPasswordByEmail(email) {
  return sendPasswordResetEmail(firebaseAuth, email);
}
