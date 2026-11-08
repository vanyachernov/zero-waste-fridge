/**
 * Клієнтська валідація — ті самі правила й коди, що й на бекенді
 * (Bean Validation + PasswordPolicy), тож тексти помилок спільні (`errors.fields.*`).
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FieldCode = "NotBlank" | "Email" | "Size" | "REQUIRED" | "TOO_SHORT" | "TOO_LONG" | "MISMATCH";

export function validateEmail(value: string): FieldCode | null {
  const email = value.trim();
  if (!email) return "NotBlank";
  if (email.length > 254 || !EMAIL_RE.test(email)) return "Email";
  return null;
}

export const PASSWORD_MIN_CHARS = 8;
export const PASSWORD_MAX_BYTES = 72;

/** Мінімум 8 символів (code points), максимум 72 байти UTF-8 — межа BCrypt. */
export function validateNewPassword(value: string): FieldCode | null {
  if (!value.trim()) return "REQUIRED";
  if ([...value].length < PASSWORD_MIN_CHARS) return "TOO_SHORT";
  if (new TextEncoder().encode(value).length > PASSWORD_MAX_BYTES) return "TOO_LONG";
  return null;
}

/** Для входу перевіряємо лише заповненість — правила могли змінитися після реєстрації. */
export function validateLoginPassword(value: string): FieldCode | null {
  return value.trim() ? null : "NotBlank";
}

export function validateName(value: string): FieldCode | null {
  const name = value.trim();
  if (!name) return "NotBlank";
  if (name.length > 80) return "Size";
  return null;
}

export function validatePasswordConfirmation(password: string, confirmation: string): FieldCode | null {
  if (!confirmation) return "REQUIRED";
  return password === confirmation ? null : "MISMATCH";
}

export function hasErrors(errors: Record<string, unknown>): boolean {
  return Object.values(errors).some(Boolean);
}
