// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, serverTimestamp } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

// Debug: Log the config to check if env vars are loaded
console.log("Firebase Config:", {
  apiKey: firebaseConfig.apiKey ? "✓ Loaded" : "✗ Missing",
  authDomain: firebaseConfig.authDomain ? "✓ Loaded" : "✗ Missing",
  projectId: firebaseConfig.projectId ? "✓ Loaded" : "✗ Missing",
  storageBucket: firebaseConfig.storageBucket ? "✓ Loaded" : "✗ Missing",
  messagingSenderId: firebaseConfig.messagingSenderId ? "✓ Loaded" : "✗ Missing",
  appId: firebaseConfig.appId ? "✓ Loaded" : "✗ Missing",
});

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const createdAt = () => serverTimestamp();
