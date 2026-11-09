import type { Dictionaries, Category, Product } from "@zwf/api-client";
import type { Translator } from "@zwf/i18n";

const DAY = 24 * 60 * 60 * 1000;

/** Локальна дата `YYYY-MM-DD` — як у полях `<input type="date">`. */
export function todayIso(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return todayIso(new Date(y!, m! - 1, d! + days));
}

/** Днів до дати (для попереднього перегляду у формі; у списку — `daysLeft` із сервера). */
export function daysLeft(expiresAt: string, now = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const [y, m, d] = expiresAt.split("-").map(Number);
  const exp = new Date(y!, (m ?? 1) - 1, d ?? 1).getTime();
  return Math.round((exp - today) / DAY);
}

export const dayUnit = (n: number, { plural }: Pick<Translator, "plural">) => plural(Math.abs(n), ["день", "дні", "днів"]);

export function freshnessLabel(days: number, { t, plural }: Pick<Translator, "t" | "plural">): string {
  if (days < 0) return t("freshness.expired");
  if (days === 0) return t("freshness.today");
  const unit = plural(days, ["день", "дні", "днів"]);
  if (days <= 2) return t("freshness.days", { n: days, unit });
  if (days >= 14) {
    const w = Math.floor(days / 7);
    return t("freshness.freshWeeks", { n: w, unit: plural(w, ["тиждень", "тижні", "тижнів"]) });
  }
  return t("freshness.fresh", { n: days, unit });
}

/** «350 г», «1.5 л», «2 шт». */
export function formatQty(p: Pick<Product, "quantity" | "unit">, { messages }: Pick<Translator, "messages">): string {
  const q = Number.isInteger(p.quantity) ? p.quantity : Number(p.quantity.toFixed(3));
  return `${q} ${messages.units[p.unit]}`;
}

/** Те саме правило, що в B-12 (OpenedShelfLife): ключові слова в назві, інакше типовий термін категорії. */
export function openedShelfLife(dictionaries: Dictionaries, category: Category, name: string): number {
  const lower = name.toLowerCase();
  const rule = dictionaries.openedShelfLifeRules.find((r) => r.category === category && r.keywords.some((k) => lower.includes(k)));
  return rule?.days ?? dictionaries.categories.find((c) => c.code === category)?.openedShelfLifeDays ?? 3;
}
