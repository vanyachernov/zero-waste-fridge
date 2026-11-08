import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { configureApi, mockAuthControl } from "@zwf/api-client";
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

if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

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
  mockAuthControl.reset();
  configureApi({ mock: true });
});

afterEach(() => {
  cleanup();
});
