import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

const getInitialScheme = () => {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem("golfTripTheme");
  if (stored) {
    return stored === "dark";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
};

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(getInitialScheme);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle("dark", isDark);
    localStorage.setItem("golfTripTheme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event) => {
      const stored = localStorage.getItem("golfTripTheme");
      if (stored) return;
      setIsDark(event.matches);
    };
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

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
