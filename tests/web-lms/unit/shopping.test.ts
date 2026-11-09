import { changeQuantity, parseQuickAdd, quantityStep, shareText } from "@lms/lib/shopping";
import { relativeTime } from "@lms/lib/time";
import { createTranslator } from "@zwf/i18n";
import { describe, expect, it } from "vitest";

const i18n = createTranslator("uk");

describe("shopping helpers", () => {
  it("parses quantity and unit at the end of the quick add text", () => {
    expect(parseQuickAdd("Вівсяне молоко Barista 1 л")).toEqual({ name: "Вівсяне молоко Barista", quantity: 1, unit: "l" });
    expect(parseQuickAdd(" Шпинат  150г ")).toEqual({ name: "Шпинат", quantity: 150, unit: "g" });
    expect(parseQuickAdd("Яйця С0, 10 шт.")).toEqual({ name: "Яйця С0", quantity: 10, unit: "pcs" });
    expect(parseQuickAdd("Сир 0,5 кг")).toEqual({ name: "Сир", quantity: 0.5, unit: "kg" });
    expect(parseQuickAdd("Хліб")).toEqual({ name: "Хліб", quantity: null, unit: null });
    expect(parseQuickAdd("Coca-Cola 0 л")).toEqual({ name: "Coca-Cola 0 л", quantity: null, unit: null });
  });

  it("quantity steps by unit and never goes to zero", () => {
    expect(quantityStep("g")).toBe(50);
    expect(quantityStep("kg")).toBe(0.5);
    expect(quantityStep(null)).toBe(1);
    expect(changeQuantity({ quantity: 150, unit: "g" }, 1)).toEqual({ quantity: 200, unit: "g" });
    expect(changeQuantity({ quantity: 50, unit: "g" }, -1)).toBeNull();
    expect(changeQuantity({ quantity: null, unit: null }, 1)).toEqual({ quantity: 2, unit: "pcs" });
    expect(changeQuantity({ quantity: 1.5, unit: "l" }, -1)).toEqual({ quantity: 1, unit: "l" });
  });

  it("share text and relative time", () => {
    const text = shareText(
      [
        { name: "Шпинат", quantity: 150, unit: "g", store: { id: "s", name: "Сільпо" } },
        { name: "Хліб", quantity: null, unit: null, store: null },
      ] as never,
      i18n,
    );
    expect(text).toBe("Список покупок · Zero Waste Fridge\n\n• Шпинат — 150 г (Сільпо)\n• Хліб");

    const now = new Date(2026, 10, 9, 15, 0);
    const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
    expect(relativeTime(ago(10_000), i18n, now)).toBe("щойно");
    expect(relativeTime(ago(15 * 60_000), i18n, now)).toBe("15 хв тому");
    expect(relativeTime(ago(3 * 3_600_000), i18n, now)).toBe("3 год тому");
    expect(relativeTime(new Date(2026, 10, 8, 20, 0).toISOString(), i18n, now)).toBe("вчора");
    expect(relativeTime(new Date(2026, 10, 6, 9, 0).toISOString(), i18n, now)).toBe("3 дні тому");
  });
});
