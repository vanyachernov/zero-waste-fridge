import { en } from "./locales/en";
import { uk, type Messages } from "./locales/uk";

export type { Messages };
export const locales = ["uk", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "uk";

// ---------- типізовані ключі виду "fridge.title" ----------
type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${P}${K}`
    : T[K] extends readonly string[]
      ? `${P}${K}`
      : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];
export type MessageKey = Leaves<Messages>;

type Params = Record<string, string | number>;

function deepMerge<T>(base: T, override: unknown): T {
  if (!override || typeof override !== "object" || Array.isArray(override)) return (override as T) ?? base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(override)) out[k] = deepMerge(out[k], v);
  return out as T;
}

const dictionaries: Record<Locale, Messages> = { uk, en: deepMerge(uk, en) };

export function getMessages(locale: Locale = defaultLocale): Messages {
  return dictionaries[locale] ?? uk;
}

export type Translator = ReturnType<typeof createTranslator>;

export function createTranslator(locale: Locale = defaultLocale) {
  const messages = getMessages(locale);
  const pr = new Intl.PluralRules(locale);

  function t(key: MessageKey, params?: Params): string {
    const value = key.split(".").reduce<unknown>((acc, part) => (acc as Record<string, unknown>)?.[part], messages);
    if (typeof value !== "string") return key;
    return params ? value.replace(/\{(\w+)\}/g, (_, p: string) => String(params[p] ?? `{${p}}`)) : value;
  }

  /** Українські форми множини: one / few / many. Приклад: plural(2, ["день","дні","днів"]). */
  function plural(n: number, forms: [one: string, few: string, many: string]): string {
    const rule = pr.select(n);
    if (rule === "one") return forms[0];
    if (rule === "few") return forms[1];
    return forms[2];
  }

  const dateFmt = new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-GB", { day: "numeric", month: "short", year: "numeric" });

  const shortFmt = new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-GB", { day: "numeric", month: "short" });

  return {
    t,
    plural,
    messages,
    locale,
    formatDate: (d: Date | string) => dateFmt.format(new Date(d)),
    /** Без року — для компактних карток: «14 лист.». */
    formatShortDate: (d: Date | string) => shortFmt.format(new Date(d)),
  };
}
