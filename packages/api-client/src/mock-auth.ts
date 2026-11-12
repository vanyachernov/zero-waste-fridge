import { ApiError } from "./http";
import type { CurrentUser, LoginRequest, RegisterRequest, ResetPasswordRequest, ThemePreference } from "./types";

/**
 * In-memory імітація B-02…B-06 для розробки й тестів UI без Spring Boot.
 * Відтворює ті самі статуси й коди помилок, що й бекенд (ProblemDetail `code` / `errors`).
 */

export const DEMO_ACCOUNT = { email: "olena@example.com", password: "Secret-pass-123" } as const;

const SESSION_KEY = "zwf.mock.session";
const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

export interface MockAccount {
  user: CurrentUser;
  password: string;
  joinedAt: string;
}
type Account = MockAccount;

let accounts = new Map<string, Account>();
let session: string | null = null;
let resetTokens = new Map<string, string>();
let lastResetLink: string | null = null;
let seq = 100;

/** Демо-сім'я «Кравченки» з макета «Моя сім'я»: Олена — власниця, Максим і Софія — члени сім'ї. */
function seed() {
  const member = (id: string, name: string, email: string, role: CurrentUser["role"], joinedAt: string): [string, Account] => [
    email,
    {
      password: DEMO_ACCOUNT.password,
      joinedAt,
      user: { id, name, email, avatarUrl: null, householdId: "h1", householdName: "Сім'я Кравченко", role, theme: "system" },
    },
  ];
  accounts = new Map([
    member("u1", "Олена Кравченко", DEMO_ACCOUNT.email, "OWNER", "2026-01-10T09:00:00Z"),
    member("u2", "Максим Кравченко", "maksym@example.com", "MEMBER", "2026-01-11T09:00:00Z"),
    member("u3", "Софія Кравченко", "sofia@example.com", "MEMBER", "2026-01-12T09:00:00Z"),
  ]);
  resetTokens = new Map();
  lastResetLink = null;
  session = readSession();
}

function readSession(): string | null {
  try {
    return globalThis.localStorage?.getItem(SESSION_KEY) ?? null;
  } catch {
    return null;
  }
}

function writeSession(email: string | null) {
  session = email;
  try {
    if (email) globalThis.localStorage?.setItem(SESSION_KEY, email);
    else globalThis.localStorage?.removeItem(SESSION_KEY);
  } catch {
    /* приватний режим тощо — сесія лишиться в пам'яті */
  }
}

const normalize = (email: string) => email.trim().toLowerCase();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function passwordViolation(password: string | undefined): string | null {
  if (!password || !password.trim()) return "REQUIRED";
  if ([...password].length < 8) return "TOO_SHORT";
  if (new TextEncoder().encode(password).length > 72) return "TOO_LONG";
  return null;
}

function validation(errors: Record<string, string>) {
  return new ApiError(400, "Request validation failed", { code: "VALIDATION_FAILED", fieldErrors: errors });
}

function householdName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? `Сім'я ${parts[parts.length - 1]}` : "Мій холодильник";
}

seed();

export const mockAuth = {
  async me(): Promise<CurrentUser> {
    await delay(80);
    const account = session ? accounts.get(session) : undefined;
    if (!account) throw new ApiError(401, "Unauthorized");
    return { ...account.user };
  },

  async login({ email, password }: LoginRequest): Promise<CurrentUser> {
    await delay();
    const errors: Record<string, string> = {};
    if (!email?.trim()) errors.email = "NotBlank";
    else if (!EMAIL_RE.test(email.trim())) errors.email = "Email";
    if (!password?.trim()) errors.password = "NotBlank";
    if (Object.keys(errors).length) throw validation(errors);

    const account = accounts.get(normalize(email));
    if (!account || account.password !== password) {
      throw new ApiError(401, "Invalid email or password", { code: "INVALID_CREDENTIALS" });
    }
    writeSession(account.user.email);
    return { ...account.user };
  },

  async register({ name, email, password }: RegisterRequest): Promise<CurrentUser> {
    await delay();
    const errors: Record<string, string> = {};
    if (!name?.trim()) errors.name = "NotBlank";
    else if (name.trim().length > 80) errors.name = "Size";
    if (!email?.trim()) errors.email = "NotBlank";
    else if (!EMAIL_RE.test(email.trim())) errors.email = "Email";
    if (Object.keys(errors).length) throw validation(errors);
    const violation = passwordViolation(password);
    if (violation) {
      throw new ApiError(400, "Password does not satisfy the policy", { code: "PASSWORD_POLICY", fieldErrors: { password: violation } });
    }
    const key = normalize(email);
    if (accounts.has(key)) {
      throw new ApiError(409, "Email is already registered", { code: "EMAIL_TAKEN", fieldErrors: { email: "EMAIL_TAKEN" } });
    }
    const id = `u${++seq}`;
    const cleanName = name.trim().replace(/\s+/g, " ");
    const user: CurrentUser = {
      id,
      name: cleanName,
      email: key,
      avatarUrl: null,
      householdId: `h${seq}`,
      householdName: householdName(cleanName),
      role: "OWNER",
      theme: "system",
    };
    accounts.set(key, { user, password, joinedAt: new Date().toISOString() });
    writeSession(key);
    return { ...user };
  },

  /** F-90: як `PUT /api/me/theme`. */
  async setTheme(theme: ThemePreference): Promise<void> {
    await delay(60);
    const account = session ? accounts.get(session) : undefined;
    if (!account) throw new ApiError(401, "Unauthorized");
    if (theme !== "light" && theme !== "dark" && theme !== "system") throw validation({ theme: "INVALID" });
    account.user.theme = theme;
  },

  async logout(): Promise<void> {
    await delay(80);
    writeSession(null);
  },

  async forgotPassword(email: string): Promise<void> {
    await delay();
    if (!email?.trim() || !EMAIL_RE.test(email.trim())) throw validation({ email: email?.trim() ? "Email" : "NotBlank" });
    const key = normalize(email);
    if (!accounts.has(key)) return; // як і бекенд — не розкриваємо, чи існує акаунт
    const token = `mock-${crypto.randomUUID()}`;
    resetTokens.set(token, key);
    lastResetLink = `/lms/reset-password?token=${encodeURIComponent(token)}`;
    console.info(`[mock mail] Відновлення пароля для ${key}: ${lastResetLink}`);
  },

  async resetPassword({ token, password }: ResetPasswordRequest): Promise<void> {
    await delay();
    const violation = passwordViolation(password);
    if (violation) {
      throw new ApiError(400, "Password does not satisfy the policy", { code: "PASSWORD_POLICY", fieldErrors: { password: violation } });
    }
    const email = resetTokens.get(token);
    const account = email ? accounts.get(email) : undefined;
    if (!account) throw new ApiError(400, "Password reset link is invalid or has expired", { code: "INVALID_RESET_TOKEN" });
    account.password = password;
    resetTokens.delete(token);
    if (session === email) writeSession(null); // бекенд завершує всі сесії користувача
  },
};

/**
 * Коли auth справжній, а дані на моках (`VITE_API_MOCK=data`), сесію перевіряє Spring Boot:
 * мок-сесії тоді немає, і моки даних не повинні вимагати її.
 */
let sessionRequired = true;

export function setMockSessionRequired(required: boolean) {
  sessionRequired = required;
}

/** Як Spring Security для `/api/**`: без сесії — 401. */
export function requireMockSession() {
  if (!sessionRequired) return;
  if (!session || !accounts.has(session)) throw new ApiError(401, "Unauthorized");
}

/**
 * Користувач мок-сесії для моків даних (автор продукту, домогосподарство). Коли auth справжній
 * (`VITE_API_MOCK=data`), мок-сесії немає — дані тоді живуть у спільному «зовнішньому» домогосподарстві.
 */
export function mockSessionUser(): CurrentUser | null {
  const account = session ? accounts.get(session) : undefined;
  return account ? { ...account.user } : null;
}

/** Доступ до акаунтів для моку сім'ї (B-50…B-55): учасники, ролі, переходи між домогосподарствами. */
export const mockAccounts = {
  all: () => [...accounts.values()],
  byId: (id: string) => [...accounts.values()].find((a) => a.user.id === id),
  byEmail: (email: string) => accounts.get(normalize(email)),
  nextHouseholdId: () => `h${++seq}`,
  /** Видалений або переміщений користувач і далі залогінений — як і на бекенді. */
  endSessionsOf: (email: string) => {
    if (session === email) writeSession(null);
  },
};

/** Хелпери лише для тестів і dev-інструментів. */
export const mockAuthControl = {
  reset() {
    writeSession(null);
    seq = 100;
    seed();
  },
  lastResetLink: () => lastResetLink,
  signIn(email: string = DEMO_ACCOUNT.email) {
    writeSession(normalize(email));
  },
  /** Імітує завершення сесії на сервері (таймаут, вихід на іншому пристрої). */
  expireSession() {
    writeSession(null);
  },
};
