import React, { useState, useEffect, createContext, useContext } from "react";
import { db } from "../firebase";
import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import imageCompression from "browser-image-compression";
import bcrypt from "bcryptjs";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

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
      formData.append("upload_preset", "unsigned_preset");

      profilePictureUrl = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(
          "POST",
          "https://api.cloudinary.com/v1_1/diozpffn6/image/upload"
        );
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
      password: hashedPassword, // store hashed password
      handicap: parseFloat(handicap),
      profilePictureUrl,
      createdAt: new Date(),
    };

    await setDoc(doc(db, "users", userId), userData);

    return userData;
  };

  // -------------------
  // Login
  // -------------------
  const login = async (displayName, password) => {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("displayName", "==", displayName));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) throw new Error("Invalid display name or password");

    const userDoc = querySnapshot.docs[0].data();
    const match = await bcrypt.compare(password, userDoc.password);

    if (!match) throw new Error("Invalid display name or password");

    setUserAndPersist(userDoc);
    return userDoc;
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
    if (userData)
      localStorage.setItem("golfTripUser", JSON.stringify(userData));
    else localStorage.removeItem("golfTripUser");
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
      formData.append("upload_preset", "unsigned_preset");

      profilePictureUrl = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(
          "POST",
          "https://api.cloudinary.com/v1_1/diozpffn6/image/upload"
        );
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

    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) throw new Error("Old password is incorrect");

    const newHashed = await bcrypt.hash(newPassword, 10);
    await setDoc(doc(db, "users", user.uid), { password: newHashed }, { merge: true });

    // Update local user object so we keep the hashed password in memory
    const updatedUser = { ...user, password: newHashed };
    setUserAndPersist(updatedUser);

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
        updateProfile,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
