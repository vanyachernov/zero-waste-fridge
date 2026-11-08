/**
 * Базовий HTTP-клієнт (також використовується як `mutator` для коду, що генерує orval).
 *
 * - Авторизація через HttpOnly-cookie сесії Spring → `credentials: "include"`, жодних токенів у JS.
 * - CSRF: Spring Security (CookieCsrfTokenRepository) кладе токен у cookie `XSRF-TOKEN`
 *   (не HttpOnly), ми дзеркалимо його в заголовок `X-XSRF-TOKEN` для небезпечних методів.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let baseUrl = "/api";
let onUnauthorized: (() => void) | undefined;

export function configureHttp(options: { baseUrl?: string; onUnauthorized?: () => void }) {
  if (options.baseUrl !== undefined) baseUrl = options.baseUrl;
  onUnauthorized = options.onUnauthorized;
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function http<T>(url: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (UNSAFE.has(method)) {
    const xsrf = readCookie("XSRF-TOKEN");
    if (xsrf) headers.set("X-XSRF-TOKEN", xsrf);
  }

  const res = await fetch(`${baseUrl}${url}`, { ...init, method, headers, credentials: "include" });

  if (res.status === 401) onUnauthorized?.();
  if (!res.ok) {
    const body = await res.json().catch(() => undefined);
    throw new ApiError(res.status, res.statusText || `HTTP ${res.status}`, body);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export default http;
