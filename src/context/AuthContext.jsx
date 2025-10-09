import React, { useState, useEffect, createContext, useContext } from "react";
import { db } from "../firebase";
import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import imageCompression from "browser-image-compression";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // -------------------
  // Signup
  // -------------------
  const signup = async (displayName, password, handicap, profilePicture) => {
    // Check for duplicate display name
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("displayName", "==", displayName));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      throw new Error("Display name already exists. Choose a different one.");
    }

    // Generate unique user ID
    const userId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let profilePictureUrl = null;

    // Upload profile picture if provided
    if (profilePicture) {
      const compressedFile = await imageCompression(profilePicture, { maxSizeMB: 0.5, maxWidthOrHeight: 500, useWebWorker: true });
      const storage = getStorage();
      const storageRef = ref(storage, `profile-pictures/${userId}`);

      profilePictureUrl = await new Promise((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, compressedFile);
        uploadTask.on(
          "state_changed",
          null,
          (error) => reject(error),
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          }
        );
      });
    }

    const userData = {
      uid: userId,
      displayName,
      handicap: parseFloat(handicap),
      profilePictureUrl,
      createdAt: new Date(),
    };

    await setDoc(doc(db, "users", userId), userData);
    return { uid: userId, ...userData };
  };

  // -------------------
  // Login
  // -------------------
  const login = async (displayName, password) => {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("displayName", "==", displayName));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) throw new Error("Invalid display name or password.");

    const userDoc = querySnapshot.docs[0];
    return userDoc.data();
  };

  // -------------------
  // Logout
  // -------------------
  const logout = () => {
    setUser(null);
    localStorage.removeItem("golfTripUser");
  };

  // -------------------
  // Auth state persistence
  // -------------------
  useEffect(() => {
    const storedUser = localStorage.getItem("golfTripUser");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const setUserAndPersist = (userData) => {
    setUser(userData);
    if (userData) localStorage.setItem("golfTripUser", JSON.stringify(userData));
    else localStorage.removeItem("golfTripUser");
  };

  // -------------------
  // Update Profile
  // -------------------
  

// Inside AuthProvider
const updateProfile = async (displayName, handicap, profilePicture, onProgress) => {
  if (!user) throw new Error("No user logged in");

  // Check display name uniqueness
  if (displayName !== user.displayName) {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("displayName", "==", displayName));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      throw new Error("Display name already exists. Please choose a different one.");
    }
  }

  let profilePictureUrl = user.profilePictureUrl;

  if (profilePicture) {
    // Compress image if you want (optional)
    const storage = getStorage();
    const storageRef = ref(storage, `profile-pictures/${user.uid}`);
    const uploadTask = uploadBytesResumable(storageRef, profilePicture);

    await new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          if (onProgress) onProgress(progress); // Update progress
        },
        (error) => reject(error),
        async () => {
          profilePictureUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve();
        }
      );
    });
  }

  const updatedUserData = {
    ...user,
    displayName,
    handicap: parseFloat(handicap),
    profilePictureUrl
  };

  await setDoc(doc(db, "users", user.uid), updatedUserData, { merge: true });
  setUserAndPersist(updatedUserData);

  return updatedUserData;
};


  // -------------------
  // Update Password (placeholder)
  // -------------------
  const updatePassword = async (oldPassword, newPassword) => {
    if (!user) throw new Error("No user logged in");
    return { success: true };
  };

  return (
    <AuthContext.Provider value={{ user, signup, login, logout, setUserAndPersist, updateProfile, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
