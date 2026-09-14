"use client";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  const nextPreference =
    preference === "light" ? "dark" : preference === "dark" ? "system" : "light";
  const nextMode = `${nextPreference[0].toUpperCase()}${nextPreference.slice(1)}`;

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={`Current theme: ${preference}. Switch to ${nextMode} mode`}
      title={`Theme: ${preference}. Switch to ${nextMode}`}
      aria-pressed={preference === "dark"}
      onClick={() => setPreference(nextPreference)}
    >
      {preference === "dark" ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3v2m0 14v2M4.2 4.2l1.4 1.4m12.8 12.8 1.4 1.4M3 12h2m14 0h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />
        </svg>
      )}
    </button>
  );
}
