"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type ThemePreference = "system" | "dark";
const ThemeContext = createContext<{
  preference: ThemePreference;
  setPreference: (theme: ThemePreference) => void;
}>({ preference: "system", setPreference: () => {} });

function applyTheme(preference: ThemePreference) {
  const dark =
    preference === "dark" ||
    (preference === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    const saved = localStorage.getItem("attendance_theme");
    setPreferenceState(saved === "dark" ? "dark" : "system");
  }, []);

  useEffect(() => {
    applyTheme(preference);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      if (preference === "system") applyTheme("system");
    };
    media.addEventListener?.("change", listener);
    return () => media.removeEventListener?.("change", listener);
  }, [preference]);

  function setPreference(theme: ThemePreference) {
    setPreferenceState(theme);
    localStorage.setItem("attendance_theme", theme);
    applyTheme(theme);
  }
  return (
    <ThemeContext.Provider value={{ preference, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
