import { useCallback, useEffect, useState } from "react";

/** Тема інтерфейсу: світла / темна (макети «— Dark») / як у системі. */
export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "zwf.theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

export function readThemePreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): "light" | "dark" {
  return preference === "system" ? (systemPrefersDark ? "dark" : "light") : preference;
}

function systemPrefersDark() {
  return typeof window.matchMedia === "function" && window.matchMedia(DARK_QUERY).matches;
}

/** Клас `.dark` на <html> перемикає CSS-змінні з `@zwf/ui/styles.css`. */
export function applyTheme(preference: ThemePreference) {
  const theme = resolveTheme(preference, systemPrefersDark());
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function saveThemePreference(preference: ThemePreference) {
  try {
    if (preference === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    /* приватний режим — тема діятиме до перезавантаження */
  }
}

/** Застосувати збережену тему до першого рендеру і стежити за системною темою. */
export function initTheme(): () => void {
  applyTheme(readThemePreference());
  if (typeof window.matchMedia !== "function") return () => {};
  const media = window.matchMedia(DARK_QUERY);
  const onChange = () => {
    if (readThemePreference() === "system") applyTheme("system");
  };
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function useTheme(): [ThemePreference, (preference: ThemePreference) => void] {
  const [preference, setPreference] = useState<ThemePreference>(readThemePreference);

  useEffect(() => {
    applyTheme(preference);
  }, [preference]);

  const update = useCallback((next: ThemePreference) => {
    saveThemePreference(next);
    setPreference(next);
  }, []);

  return [preference, update];
}
