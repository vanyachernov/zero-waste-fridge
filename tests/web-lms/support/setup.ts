import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { configureApi, mockAuthControl, mockFridgeControl } from "@zwf/api-client";
import { afterEach, beforeEach, vi } from "vitest";

// ---------- Поліфіли того, чого немає в jsdom ----------

if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}

/** Керована заглушка matchMedia: тести можуть перемикати системну тему через `setSystemDark()`. */
const mediaListeners = new Set<() => void>();
let systemDark = false;
export function setSystemDark(value: boolean) {
  systemDark = value;
  mediaListeners.forEach((listener) => listener());
}
window.matchMedia = ((query: string) => ({
  get matches() {
    return query.includes("prefers-color-scheme: dark") ? systemDark : false;
  },
  media: query,
  onchange: null,
  addEventListener: (_: string, listener: () => void) => mediaListeners.add(listener),
  removeEventListener: (_: string, listener: () => void) => mediaListeners.delete(listener),
  addListener: (listener: () => void) => mediaListeners.add(listener),
  removeListener: (listener: () => void) => mediaListeners.delete(listener),
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

// Node 22+ має власний глобальний `localStorage` (без --localstorage-file він undefined) і він
// перекриває jsdom-івський — підставляємо просте сховище в пам'яті.
class MemoryStorage implements Storage {
  private items = new Map<string, string>();
  get length() {
    return this.items.size;
  }
  clear() {
    this.items.clear();
  }
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  key(index: number) {
    return [...this.items.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
  setItem(key: string, value: string) {
    this.items.set(key, String(value));
  }
}

for (const name of ["localStorage", "sessionStorage"] as const) {
  if (!globalThis[name]) {
    Object.defineProperty(globalThis, name, { value: new MemoryStorage(), configurable: true, writable: true });
  }
}

// Мок-бекенд імітує мережеві затримки (80–700 мс), а переходи чекають на лоадери маршрутів
configure({ asyncUtilTimeout: 3000 });

// ---------- Ізоляція тестів ----------

beforeEach(() => {
  localStorage.clear();
  document.cookie.split(";").forEach((c) => {
    document.cookie = `${c.split("=")[0]!.trim()}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  });
  document.documentElement.className = "";
  document.documentElement.style.colorScheme = "";
  systemDark = false;
  mediaListeners.clear();
  mockAuthControl.reset();
  mockFridgeControl.reset();
  configureApi({ mock: true });
});

afterEach(() => {
  cleanup();
});
