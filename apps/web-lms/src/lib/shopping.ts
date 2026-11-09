import type { ShoppingItem, Unit } from "@zwf/api-client";
import type { Translator } from "@zwf/i18n";

const UNIT_WORDS: Record<string, Unit> = { г: "g", гр: "g", кг: "kg", мл: "ml", л: "l", шт: "pcs", g: "g", kg: "kg", ml: "ml", l: "l", pcs: "pcs" };

/**
 * Рядок швидкого додавання: «Вівсяне молоко Barista 1 л» → назва + кількість + одиниця.
 * Без кількості в кінці — лише назва («Хліб»).
 */
export function parseQuickAdd(text: string): { name: string; quantity: number | null; unit: Unit | null } {
  const clean = text.trim().replace(/\s+/g, " ");
  const match = clean.match(/^(.+?)[\s,]+(\d+(?:[.,]\d+)?)\s*(кг|гр|г|мл|л|шт|kg|g|ml|l|pcs)\.?$/i);
  if (!match) return { name: clean, quantity: null, unit: null };
  const quantity = Number(match[2]!.replace(",", "."));
  const unit = UNIT_WORDS[match[3]!.toLowerCase()]!;
  return quantity > 0 ? { name: match[1]!.trim(), quantity, unit } : { name: clean, quantity: null, unit: null };
}

/** Крок кнопок −/+ для одиниці («Шпинат 150 г» ±50 г, «Яйця 10 шт» ±1). */
export function quantityStep(unit: Unit | null): number {
  switch (unit) {
    case "g":
    case "ml":
      return 50;
    case "kg":
    case "l":
      return 0.5;
    default:
      return 1;
  }
}

export function changeQuantity(item: Pick<ShoppingItem, "quantity" | "unit">, direction: 1 | -1): { quantity: number; unit: Unit } | null {
  const unit = item.unit ?? "pcs";
  const step = quantityStep(item.unit);
  const current = item.quantity ?? 1;
  const next = Math.round((current + direction * step) * 1000) / 1000;
  return next >= step ? { quantity: next, unit } : null;
}

export function formatItemQty(item: Pick<ShoppingItem, "quantity" | "unit">, { messages }: Pick<Translator, "messages">): string | null {
  if (item.quantity === null || item.unit === null) return null;
  return `${Number.isInteger(item.quantity) ? item.quantity : Number(item.quantity.toFixed(3))} ${messages.units[item.unit]}`;
}

/** Текст для «Поділитися списком» (F-53). */
export function shareText(items: ShoppingItem[], i18n: Pick<Translator, "messages" | "t">): string {
  const lines = items.map((item) => {
    const qty = formatItemQty(item, i18n);
    return `• ${item.name}${qty ? ` — ${qty}` : ""}${item.store ? ` (${item.store.name})` : ""}`;
  });
  return [i18n.t("shopping.shareTitle"), "", ...lines].join("\n");
}
