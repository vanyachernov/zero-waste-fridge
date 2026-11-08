import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { applyTheme, initTheme, readThemePreference, resolveTheme, THEME_STORAGE_KEY, useTheme } from "@lms/lib/theme";
import { setSystemDark } from "../support/setup";

const isDark = () => document.documentElement.classList.contains("dark");

describe("theme", () => {
  it("resolves system preference", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("reads stored preference, ignoring garbage", () => {
    expect(readThemePreference()).toBe("system");
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    expect(readThemePreference()).toBe("dark");
    localStorage.setItem(THEME_STORAGE_KEY, "neon");
    expect(readThemePreference()).toBe("system");
  });

  it("applies .dark class and color-scheme", () => {
    applyTheme("dark");
    expect(isDark()).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe("dark");
    applyTheme("light");
    expect(isDark()).toBe(false);
  });

  it("initTheme follows the OS while preference is 'system'", () => {
    const stop = initTheme();
    expect(isDark()).toBe(false);

    setSystemDark(true);
    expect(isDark()).toBe(true);

    localStorage.setItem(THEME_STORAGE_KEY, "light");
    setSystemDark(false);
    setSystemDark(true);
    expect(isDark()).toBe(true); // явний вибір «Світла» — зміни ОС ігноруються (клас не чіпаємо)
    stop();
  });

  it("useTheme persists explicit choice and clears it for 'system'", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current[0]).toBe("system");

    act(() => result.current[1]("dark"));
    expect(result.current[0]).toBe("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(isDark()).toBe(true);

    act(() => result.current[1]("system"));
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(isDark()).toBe(false);
  });
});
