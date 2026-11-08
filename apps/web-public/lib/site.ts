export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://zerowastefridge.app";

/**
 * Адреса SPA-кабінету. У продакшені обидва застосунки на одному домені (Spring Boot),
 * тому достатньо відносного шляху. У dev — Vite на :5173 (див. .env.development).
 */
export const LMS_URL = process.env.NEXT_PUBLIC_LMS_URL ?? "/lms/";
