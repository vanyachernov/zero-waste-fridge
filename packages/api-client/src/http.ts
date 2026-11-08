/**
 * Базовий HTTP-клієнт (також `mutator` для коду, що генерує orval).
 *
 * - Сесія — HttpOnly-cookie `ZWF_SESSION` (Spring Session) → `credentials: "include"`, жодних токенів у JS.
 * - CSRF (B-04): cookie `XSRF-TOKEN` дзеркалиться в заголовок `X-XSRF-TOKEN` для небезпечних методів.
 *   Якщо cookie ще немає — спершу `GET /api/auth/csrf`.
 * - Помилки бекенду — ProblemDetail з машинним `code` і `errors` ({поле: код}) → {@link ApiError}.
 */
export class ApiError extends Error {
  readonly status: number;
  /** Машинний код (`INVALID_CREDENTIALS`, `EMAIL_TAKEN`, `VALIDATION_FAILED`…), якщо бекенд його надав. */
  readonly code?: string;
  /** Помилки полів: `{ email: "Email", password: "TOO_SHORT" }`. */
  readonly fieldErrors: Readonly<Record<string, string>>;
  readonly body?: unknown;

  constructor(status: number, message: string, options: { code?: string; fieldErrors?: Record<string, string>; body?: unknown } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = options.code;
    this.fieldErrors = options.fieldErrors ?? {};
    this.body = options.body;
  }
}

export function isApiError(error: unknown, status?: number): error is ApiError {
  return error instanceof ApiError && (status === undefined || error.status === status);
}

export const CSRF_COOKIE = "XSRF-TOKEN";
export const CSRF_HEADER = "X-XSRF-TOKEN";

let baseUrl = "/api";
let onUnauthorized: ((error: ApiError) => void) | undefined;

export function configureHttp(options: { baseUrl?: string; onUnauthorized?: (error: ApiError) => void }) {
  if (options.baseUrl !== undefined) baseUrl = options.baseUrl;
  onUnauthorized = options.onUnauthorized;
}

export function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

export interface HttpOptions extends RequestInit {
  /**
   * Не викликати глобальний обробник 401 (редірект на вхід). Для auth-ендпоінтів:
   * 401 від `/auth/login` — це «неправильний пароль», а не «сесія закінчилась».
   */
  skipUnauthorizedHandler?: boolean;
}

const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

async function ensureCsrfCookie() {
  if (readCookie(CSRF_COOKIE)) return;
  await fetch(`${baseUrl}/auth/csrf`, { credentials: "include", headers: { Accept: "application/json" } });
}

export async function http<T>(url: string, init: HttpOptions = {}): Promise<T> {
  const { skipUnauthorizedHandler, ...requestInit } = init;
  const method = (requestInit.method ?? "GET").toUpperCase();
  const headers = new Headers(requestInit.headers);
  headers.set("Accept", "application/json");
  if (requestInit.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (UNSAFE.has(method)) {
    await ensureCsrfCookie();
    const token = readCookie(CSRF_COOKIE);
    if (token) headers.set(CSRF_HEADER, token);
  }

  const res = await fetch(`${baseUrl}${url}`, { ...requestInit, method, headers, credentials: "include" });

  if (!res.ok) {
    const error = await toApiError(res);
    if (res.status === 401 && !skipUnauthorizedHandler) onUnauthorized?.(error);
    throw error;
  }
  const text = res.status === 204 || res.status === 202 ? "" : await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

async function toApiError(res: Response): Promise<ApiError> {
  const body: unknown = await res
    .clone()
    .json()
    .catch(() => undefined);
  const problem = (body && typeof body === "object" ? body : {}) as { detail?: unknown; code?: unknown; errors?: unknown };
  return new ApiError(res.status, typeof problem.detail === "string" ? problem.detail : res.statusText || `HTTP ${res.status}`, {
    code: typeof problem.code === "string" ? problem.code : undefined,
    fieldErrors: problem.errors && typeof problem.errors === "object" ? (problem.errors as Record<string, string>) : undefined,
    body,
  });
}

export default http;
