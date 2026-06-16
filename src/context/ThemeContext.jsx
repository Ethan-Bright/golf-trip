import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

const getInitialScheme = () => {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem("golfTripTheme");
  if (stored) {
    return stored === "dark";
  }
  // Modern revamp ships dark-first; users can still toggle to light.
  return true;
};

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(getInitialScheme);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle("dark", isDark);
    localStorage.setItem("golfTripTheme", isDark ? "dark" : "light");
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem("golfTripTheme", next ? "dark" : "light");
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
