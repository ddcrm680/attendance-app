"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type ThemePreference = "light" | "system" | "dark";
const accentPattern = /^#[0-9a-f]{6}$/i;

const ThemeContext = createContext<{
  preference: ThemePreference;
  setPreference: (theme: ThemePreference) => void;
  accent: string | null;
  setAccent: (accent: string | null) => boolean;
}>({
  preference: "system",
  setPreference: () => {},
  accent: null,
  setAccent: () => false,
});

function applyTheme(preference: ThemePreference) {
  const dark =
    preference === "dark" ||
    (preference === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

function accentForeground(accent: string) {
  const channels = accent.match(/[0-9a-f]{2}/gi)?.map((value) => parseInt(value, 16)) ?? [49, 89, 216];
  const luminance = channels
    .map((channel) => channel / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
    .reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index], 0);
  const whiteContrast = 1.05 / (luminance + 0.05);
  const darkContrast = (luminance + 0.05) / 0.0598;
  const contrast = Math.max(whiteContrast, darkContrast);
  return { color: darkContrast > whiteContrast ? "#101827" : "#ffffff", contrast };
}

function applyAccent(accent: string | null) {
  if (!accent) {
    document.documentElement.style.removeProperty("--accent");
    document.documentElement.style.removeProperty("--accent-foreground");
    document.documentElement.style.removeProperty("--on-accent");
    document.documentElement.removeAttribute("data-accent-custom");
    return;
  }
  const foreground = accentForeground(accent).color;
  document.documentElement.style.setProperty("--accent", accent);
  document.documentElement.style.setProperty("--accent-foreground", foreground);
  document.documentElement.style.setProperty("--on-accent", foreground);
  document.documentElement.setAttribute("data-accent-custom", "");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [accent, setAccentState] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("attendance_theme");
    setPreferenceState(
      saved === "light" || saved === "dark" || saved === "system"
        ? saved
        : "system",
    );
    const savedAccent = localStorage.getItem("attendance_accent");
    if (savedAccent && accentPattern.test(savedAccent) && accentForeground(savedAccent).contrast >= 4.5) setAccentState(savedAccent);
  }, []);

  useEffect(() => {
    applyTheme(preference);
    applyAccent(accent);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      if (preference === "system") applyTheme("system");
    };
    media.addEventListener?.("change", listener);
    return () => media.removeEventListener?.("change", listener);
  }, [accent, preference]);

  function setPreference(theme: ThemePreference) {
    setPreferenceState(theme);
    localStorage.setItem("attendance_theme", theme);
    applyTheme(theme);
  }
  function setAccent(nextAccent: string | null) {
    if (!nextAccent) {
      setAccentState(null);
      localStorage.removeItem("attendance_accent");
      applyAccent(null);
      return true;
    }
    if (!accentPattern.test(nextAccent) || accentForeground(nextAccent).contrast < 4.5) return false;
    const normalizedAccent = nextAccent.toLowerCase();
    setAccentState(normalizedAccent);
    localStorage.setItem("attendance_accent", normalizedAccent);
    applyAccent(normalizedAccent);
    return true;
  }
  return (
    <ThemeContext.Provider value={{ preference, setPreference, accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
