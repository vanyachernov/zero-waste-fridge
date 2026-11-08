import type { Product } from "@zwf/api-client";
import type { Translator } from "@zwf/i18n";

const DAY = 24 * 60 * 60 * 1000;

export function daysLeft(expiresAt: string, now = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const [y, m, d] = expiresAt.split("-").map(Number);
  const exp = new Date(y!, (m ?? 1) - 1, d ?? 1).getTime();
  return Math.round((exp - today) / DAY);
}

export function freshnessLabel(days: number, { t, plural }: Translator): string {
  if (days < 0) return t("freshness.expired");
  if (days === 0) return t("freshness.today");
  const dayUnit = (n: number) => plural(n, ["день", "дні", "днів"]);
  if (days <= 2) return t("freshness.days", { n: days, unit: dayUnit(days) });
  if (days >= 14) {
    const w = Math.floor(days / 7);
    return t("freshness.freshWeeks", { n: w, unit: plural(w, ["тиждень", "тижні", "тижнів"]) });
  }
  return t("freshness.fresh", { n: days, unit: dayUnit(days) });
}

export function sortByUrgency(products: Product[]): Product[] {
  return [...products].sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
}

export function formatQty(p: Pick<Product, "quantity" | "unit">, { messages }: Translator): string {
  const q = p.unit === "l" || p.unit === "kg" ? p.quantity.toFixed(1) : p.quantity;
  return `${q} ${messages.units[p.unit]}`;
}
