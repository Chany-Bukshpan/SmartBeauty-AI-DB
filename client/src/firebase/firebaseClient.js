/**
 * Firebase client bootstrap: Auth (Google), optional Storage. Keys from VITE_* env with build-time fallbacks.
 */
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBAwVcwfKWCZMwRF-Xnz7t-xil1KApd2oI",
  authDomain: "final-project-43749.firebaseapp.com",
  projectId: "final-project-43749",
  storageBucket: "final-project-43749.firebasestorage.app",
  messagingSenderId: "519257317404",
  appId: "1:519257317404:web:261c0c55a9349663e43fd9",
  measurementId: "G-XLYH0MJM6N"
};


export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
export const firebaseStorage = getStorage(firebaseApp);
