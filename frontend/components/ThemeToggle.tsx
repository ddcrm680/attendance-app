"use client";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  const dark = preference === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={"Use " + (dark ? "system" : "dark") + " theme"}
      title={"Use " + (dark ? "system" : "dark") + " theme"}
      onClick={() => setPreference(dark ? "system" : "dark")}
    >
      {dark ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 14.5v-9ZM8 20h8m-4-4v4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9.5 3.5 8.2 6.2 5.5 7.5l2.7 1.3 1.3 2.7 1.3-2.7 2.7-1.3-2.7-1.3-1.3-2.7ZM17 12.5l-1.1 2.4-2.4 1.1 2.4 1.1 1.1 2.4 1.1-2.4 2.4-1.1-2.4-1.1-1.1-2.4ZM4 15.5h2m12-11v2M5.5 6l1.4 1.4m10.6 7.1 1.4 1.4" />
        </svg>
      )}
    </button>
  );
}
