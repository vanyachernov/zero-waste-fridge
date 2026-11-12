import { describe, expect, it } from "vitest";
import { PAGE_SIZE, toProductQuery, validateFridgeSearch } from "@lms/lib/fridgeSearch";
import { addDaysIso, daysLeft, formatQty, freshnessLabel, todayIso } from "@lms/lib/freshness";
import { createTranslator } from "@zwf/i18n";

describe("fridge search params (F-21)", () => {
  it("keeps only known values from the address bar", () => {
    expect(
      validateFridgeSearch({ q: "  йогурт ", category: "dairy", freshness: "expired,today,bogus", sort: "name", view: "cards", page: "3" }),
    ).toEqual({ q: "йогурт", category: "dairy", freshness: ["expired", "today"], sort: "name", view: "cards", page: 3 });
    expect(validateFridgeSearch({ category: "fish", sort: "price", view: "list", page: "0", q: "   " })).toEqual({});
    // Значення за замовчуванням не засмічують URL
    expect(validateFridgeSearch({ sort: "expiry", page: 1, view: "table" })).toEqual({});
  });

  it("maps to the API query with 8 per page", () => {
    expect(toProductQuery({})).toEqual({ q: undefined, category: undefined, freshness: undefined, sort: "expiry", page: 1, size: PAGE_SIZE });
    expect(toProductQuery({ category: "meat", page: 2, sort: "added" })).toMatchObject({ category: ["meat"], page: 2, sort: "added", size: 8 });
  });
});

describe("freshness helpers", () => {
  const i18n = createTranslator("uk");

  it("dates and labels", () => {
    expect(addDaysIso("2026-12-30", 3)).toBe("2027-01-02");
    expect(daysLeft(addDaysIso(todayIso(), 5))).toBe(5);
    expect(freshnessLabel(-1, i18n)).toBe("Прострочено");
    expect(freshnessLabel(0, i18n)).toBe("Сьогодні");
    expect(freshnessLabel(2, i18n)).toBe("2 дні");
    expect(freshnessLabel(5, i18n)).toBe("Свіже (5 днів)");
    expect(freshnessLabel(15, i18n)).toBe("Свіже (2 тижні)");
    expect(formatQty({ quantity: 1.5, unit: "l" }, i18n)).toBe("1.5 л");
    expect(formatQty({ quantity: 350, unit: "g" }, i18n)).toBe("350 г");
  });
});
