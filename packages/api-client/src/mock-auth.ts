import { ApiError } from "./http";
import type { CurrentUser, LoginRequest, RegisterRequest, ResetPasswordRequest } from "./types";

/**
 * In-memory імітація B-02…B-06 для розробки й тестів UI без Spring Boot.
 * Відтворює ті самі статуси й коди помилок, що й бекенд (ProblemDetail `code` / `errors`).
 */

export const DEMO_ACCOUNT = { email: "olena@example.com", password: "Secret-pass-123" } as const;

const SESSION_KEY = "zwf.mock.session";
const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

interface Account {
  user: CurrentUser;
  password: string;
}

let accounts = new Map<string, Account>();
let session: string | null = null;
let resetTokens = new Map<string, string>();
let lastResetLink: string | null = null;
let seq = 1;

function seed() {
  accounts = new Map([
    [
      DEMO_ACCOUNT.email,
      {
        password: DEMO_ACCOUNT.password,
        user: {
          id: "u1",
          name: "Олена Кравченко",
          email: DEMO_ACCOUNT.email,
          avatarUrl: null,
          householdId: "h1",
          householdName: "Сім'я Кравченко",
          role: "OWNER",
        },
      },
    ],
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
    };
    accounts.set(key, { user, password });
    writeSession(key);
    return { ...user };
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

/** Хелпери лише для тестів і dev-інструментів. */
export const mockAuthControl = {
  reset() {
    writeSession(null);
    seq = 1;
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
