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
  };

  // -------------------
  // Auth state persistence
  // -------------------
  useEffect(() => {
    const storedUser =
      JSON.parse(localStorage.getItem("golfTripUser")) ||
      JSON.parse(sessionStorage.getItem("golfTripUser"));
    if (storedUser) setUser(storedUser);
    setLoading(false); // <-- done loading once user restored
  }, []);

  const setUserAndPersist = (userData, remember = true) => {
    setUser(userData);
    if (userData) {
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem("golfTripUser", JSON.stringify(userData));
    } else {
      localStorage.removeItem("golfTripUser");
      sessionStorage.removeItem("golfTripUser");
    }
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
    await setDoc(
      doc(db, "users", user.uid),
      { password: newHashed },
      { merge: true }
    );

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
