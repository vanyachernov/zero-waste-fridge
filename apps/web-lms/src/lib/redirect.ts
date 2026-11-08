/**
 * Куди повернути користувача після входу. Приймаємо лише внутрішні шляхи SPA —
 * захист від open redirect (`?redirect=https://evil.example` або `//evil.example`).
 */
export const DEFAULT_REDIRECT = "/";

/** Публічні сторінки, з яких немає сенсу «повертатися» після входу. */
export const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"] as const;

export function safeRedirect(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/")) return DEFAULT_REDIRECT;
  // «//host» і «/\host» браузери трактують як інший домен
  if (value.startsWith("//") || value.startsWith("/\\")) return DEFAULT_REDIRECT;
  if (/[\u0000-\u001f]/.test(value)) return DEFAULT_REDIRECT;
  const pathname = value.split(/[?#]/)[0]!;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return DEFAULT_REDIRECT;
  return value;
}

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
