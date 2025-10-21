// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, serverTimestamp } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCYDTvTmyk27KAWq3PrEXTq5-wsCucpS4U",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "golf-leaderboard-6e8df.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "golf-leaderboard-6e8df",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "golf-leaderboard-6e8df.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "537756155267",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:537756155267:web:4d3062ec5df206e37ccab6"
};



const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const createdAt = () => serverTimestamp();
