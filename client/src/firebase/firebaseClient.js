/**
 * Firebase client bootstrap: Auth (Google), optional Storage. Keys from VITE_* env with build-time fallbacks.
 */
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDKMOJVqkg73X9AyCwfHAPdBoiT1LFzdt8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "sc-cosmetics-7290a.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "sc-cosmetics-7290a",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "sc-cosmetics-7290a.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "426819189556",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:426819189556:web:acda73c98ea6fdb129c361",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-MS83NJ1Q7Y",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
export const firebaseStorage = getStorage(firebaseApp);
