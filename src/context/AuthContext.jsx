import React, { useState, useEffect, createContext, useContext } from "react";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import imageCompression from "browser-image-compression";
import bcrypt from "bcryptjs";
import { isStandalonePWA } from "../utils/pwa";

const AuthContext = createContext();

// Cloudinary config is environment-driven (falls back to the existing project so
// uploads keep working if the env vars aren't set yet).
const CLOUDINARY_CLOUD_NAME =
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "diozpffn6";
const CLOUDINARY_UPLOAD_PRESET =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "unsigned_preset";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

// Never keep the password hash in client state / localStorage.
const stripSensitive = (userData) => {
  if (!userData || typeof userData !== "object") return userData;
  // eslint-disable-next-line no-unused-vars
  const { password, ...safe } = userData;
  return safe;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // <-- added loading state

  // -------------------
  // Signup
  // -------------------
  const signup = async (
    displayName,
    password,
    handicap,
    profilePicture,
    onProgress
  ) => {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("displayName", "==", displayName));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      throw new Error("Display name already exists. Choose a different one.");
    }

    const userId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let profilePictureUrl = null;

    if (profilePicture) {
      const compressedFile = await imageCompression(profilePicture, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 500,
        useWebWorker: true,
      });

      const formData = new FormData();
      formData.append("file", compressedFile);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      profilePictureUrl = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", CLOUDINARY_UPLOAD_URL);
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable && onProgress) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        });
        xhr.onload = () => {
          if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            resolve(data.secure_url);
          } else {
            reject(new Error("Upload failed"));
          }
        };
        xhr.onerror = () => reject(new Error("Upload error"));
        xhr.send(formData);
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userData = {
      uid: userId,
      displayName,
      password: hashedPassword,
      handicap: parseFloat(handicap),
      profilePictureUrl,
      createdAt: new Date(),
    };

    await setDoc(doc(db, "users", userId), userData);

    setUserAndPersist(userData);
    return userData;
  };

  // -------------------
  // Login
  // -------------------
  const login = async (displayName, password) => {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("displayName", "==", displayName));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty)
      throw new Error("Invalid display name or password");

    const userDoc = querySnapshot.docs[0].data();
    const match = await bcrypt.compare(password, userDoc.password);

    if (!match) throw new Error("Invalid display name or password");

    // return user data only — don’t persist here
    return userDoc;
  };

  // -------------------
  // Logout
  // -------------------
  const logout = () => {
    setUser(null);
    localStorage.removeItem("golfTripUser");
    localStorage.removeItem("currentTournament");
  };

  // -------------------
  // Auth state persistence
  // -------------------
  useEffect(() => {
    try {
      // Try to get user from localStorage first (remember me)
      const localUser = localStorage.getItem("golfTripUser");
      if (localUser) {
        try {
          const parsedUser = JSON.parse(localUser);
          if (parsedUser) {
            setUser(parsedUser);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error("Error parsing localStorage user:", e);
          // Clear corrupted data
          localStorage.removeItem("golfTripUser");
        }
      }
      
      // Fallback to sessionStorage
      const sessionUser = sessionStorage.getItem("golfTripUser");
      if (sessionUser) {
        try {
          const parsedUser = JSON.parse(sessionUser);
          if (parsedUser) {
            setUser(parsedUser);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error("Error parsing sessionStorage user:", e);
          // Clear corrupted data
          sessionStorage.removeItem("golfTripUser");
        }
      }
    } catch (e) {
      console.error("Error accessing storage:", e);
    }
    setLoading(false);
  }, []);

  const setUserAndPersist = (rawUserData, remember = null) => {
    const userData = stripSensitive(rawUserData);
    setUser(userData);
    if (userData) {
      try {
        // If remember is not specified, check which storage currently has the user
        // This preserves the user's original "remember me" preference
        let shouldRemember = remember;
        const runningStandalone = isStandalonePWA();

        if (remember === null) {
          const hasLocalStorage = localStorage.getItem("golfTripUser") !== null;
          const hasSessionStorage =
            sessionStorage.getItem("golfTripUser") !== null;
          // If localStorage has the user, they used "remember me"
          // If only sessionStorage has it, they didn't use "remember me"
          // If neither has it (new login), default to true
          shouldRemember =
            runningStandalone ||
            hasLocalStorage ||
            (!hasLocalStorage && !hasSessionStorage);
        }

        // In PWA/standalone mode, always back up to localStorage so closing the app keeps the session
        const persistToLocal = runningStandalone || shouldRemember;
        const persistToSession = !shouldRemember;

        // Always clear both storages first to avoid conflicts
        localStorage.removeItem("golfTripUser");
        sessionStorage.removeItem("golfTripUser");

        if (persistToLocal) {
          localStorage.setItem("golfTripUser", JSON.stringify(userData));
        }
        if (persistToSession) {
          sessionStorage.setItem("golfTripUser", JSON.stringify(userData));
        }
      } catch (e) {
        console.error("Error saving user to storage:", e);
        // If localStorage fails (quota exceeded, etc.), try sessionStorage as fallback
        if (remember !== false) {
          try {
            sessionStorage.setItem("golfTripUser", JSON.stringify(userData));
          } catch (e2) {
            console.error("Error saving to sessionStorage:", e2);
          }
        }
      }
    } else {
      try {
        localStorage.removeItem("golfTripUser");
        sessionStorage.removeItem("golfTripUser");
      } catch (e) {
        console.error("Error clearing storage:", e);
      }
    }
  };

  // -------------------
  // Refresh the cached user from Firestore (e.g. after joining/leaving a
  // tournament) so the UI updates reactively instead of forcing a full reload.
  // -------------------
  const refreshUser = async () => {
    if (!user?.uid) return null;
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const fresh = { ...user, ...snap.data() };
        setUserAndPersist(fresh);
        return fresh;
      }
    } catch (err) {
      console.error("Error refreshing user:", err);
    }
    return null;
  };

  // -------------------
  // Update Profile
  // -------------------
  const updateProfile = async (
    displayName,
    handicap,
    profilePicture,
    onProgress
  ) => {
    if (!user) throw new Error("No user logged in");

    if (displayName !== user.displayName) {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("displayName", "==", displayName));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty)
        throw new Error(
          "Display name already exists. Please choose a different one."
        );
    }

    let profilePictureUrl = user.profilePictureUrl;

    if (profilePicture) {
      const compressedFile = await imageCompression(profilePicture, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 500,
        useWebWorker: true,
      });

      const formData = new FormData();
      formData.append("file", compressedFile);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      profilePictureUrl = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", CLOUDINARY_UPLOAD_URL);
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable && onProgress) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        });
        xhr.onload = () => {
          if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            resolve(data.secure_url);
          } else reject(new Error("Upload failed"));
        };
        xhr.onerror = () => reject(new Error("Upload error"));
        xhr.send(formData);
      });
    }

    const updatedUserData = {
      ...user,
      displayName,
      handicap: parseFloat(handicap),
      profilePictureUrl,
    };

    await setDoc(doc(db, "users", user.uid), updatedUserData, { merge: true });
    setUserAndPersist(updatedUserData);

    return updatedUserData;
  };

  // -------------------
  // Update Password
  // -------------------
  const updatePassword = async (oldPassword, newPassword) => {
    if (!user) throw new Error("No user logged in");

    // The hash is no longer kept client-side, so re-read it to verify.
    const snap = await getDoc(doc(db, "users", user.uid));
    const currentHash = snap.exists() ? snap.data()?.password : null;
    if (!currentHash) throw new Error("Unable to verify current password");

    const match = await bcrypt.compare(oldPassword, currentHash);
    if (!match) throw new Error("Old password is incorrect");

    const newHashed = await bcrypt.hash(newPassword, 10);
    await setDoc(
      doc(db, "users", user.uid),
      { password: newHashed },
      { merge: true }
    );

    setUserAndPersist({ ...user });

    return { success: true };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        signup,
        login,
        logout,
        setUserAndPersist,
        refreshUser,
        updateProfile,
        updatePassword,
        loading, // expose loading so we can use it in PrivateRoute if needed
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
