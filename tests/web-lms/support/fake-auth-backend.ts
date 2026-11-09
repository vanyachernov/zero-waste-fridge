import type { CurrentUser } from "@zwf/api-client";
import { vi } from "vitest";

/**
 * Мінімальний «Spring Boot» для auth-ендпоінтів через підмінений `fetch`:
 * CSRF-cookie з `GET /api/auth/csrf`, перевірка `X-XSRF-TOKEN` на POST, сесія, ProblemDetail з `code`.
 * Потрібен, щоб перевірити режим `VITE_API_MOCK=data`: справжній auth, а дані — на моках.
 */
export const BACKEND_USER: CurrentUser = {
  id: "u-42",
  name: "Ірина Бекенд",
  email: "iryna@zwf.app",
  avatarUrl: null,
  householdId: "h-7",
  householdName: "Сім'я Бекенд",
  role: "OWNER",
};
export const BACKEND_PASSWORD = "Backend-pass-1";

const TOKEN = "csrf-token-123";

const problem = (status: number, code?: string) =>
  new Response(JSON.stringify({ status, detail: code ?? "error", code }), {
    status,
    headers: { "Content-Type": "application/problem+json" },
  });
const ok = (body?: unknown, status = 200) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export function installFakeAuthBackend() {
  let signedIn = false;
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    const method = (init.method ?? "GET").toUpperCase();
    const headers = new Headers(init.headers);

    if (method === "POST" && headers.get("X-XSRF-TOKEN") !== TOKEN) return problem(403, "CSRF");

    switch (`${method} ${url}`) {
      case "GET /api/auth/csrf":
        document.cookie = `XSRF-TOKEN=${TOKEN}; path=/`;
        return ok({ token: TOKEN });
      case "GET /api/auth/me":
        return signedIn ? ok(BACKEND_USER) : problem(401);
      case "POST /api/auth/login": {
        const body = JSON.parse(String(init.body)) as { email: string; password: string };
        if (body.email.trim().toLowerCase() !== BACKEND_USER.email || body.password !== BACKEND_PASSWORD) {
          return problem(401, "INVALID_CREDENTIALS");
        }
        signedIn = true;
        return ok(BACKEND_USER);
      }
      case "POST /api/auth/logout":
        signedIn = false;
        return ok(undefined, 204);
      default:
        return problem(404);
    }
  });
  vi.stubGlobal("fetch", fetchMock);

  const calls = () => fetchMock.mock.calls.map(([input, init]) => `${(init?.method ?? "GET").toUpperCase()} ${String(input)}`);
  return {
    fetchMock,
    calls,
    expireSession: () => {
      signedIn = false;
    },
  };
}
