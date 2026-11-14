import type { Dictionaries } from "@zwf/api-client";
import { createTranslator } from "@zwf/i18n";
import { getFreshness } from "@zwf/ui";
import { describe, expect, it } from "vitest";
import { addDaysIso, dayUnit, daysLeft, formatQty, freshnessLabel, openedShelfLife, todayIso } from "@lms/lib/freshness";

/** Q-02: свіжість продуктів — те, що бачить користувач у бейджах і формах. */
const i18n = createTranslator("uk");

describe("dates", () => {
  it("todayIso is the local date, zero-padded", () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });

  it("addDaysIso crosses months, years and leap days", () => {
    expect(addDaysIso("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDaysIso("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysIso("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDaysIso("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("daysLeft counts calendar days, not 24-hour periods", () => {
    const lateEvening = new Date(2026, 10, 12, 23, 30);
    expect(daysLeft("2026-11-12", lateEvening)).toBe(0);
    expect(daysLeft("2026-11-13", lateEvening)).toBe(1);
    expect(daysLeft("2026-11-10", lateEvening)).toBe(-2);
    // Перехід на зимовий час (25 жовтня) не дає «1.04 дня»
    expect(daysLeft("2026-10-26", new Date(2026, 9, 24, 12))).toBe(2);
  });
});

describe("freshness", () => {
  it.each([
    [-3, "expired", "Прострочено"],
    [0, "today", "Сьогодні"],
    [1, "soon", "1 день"],
    [2, "soon", "2 дні"],
    [3, "fresh", "Свіже (3 дні)"],
    [5, "fresh", "Свіже (5 днів)"],
    [13, "fresh", "Свіже (13 днів)"],
    [14, "fresh", "Свіже (2 тижні)"],
    [35, "fresh", "Свіже (5 тижнів)"],
  ] as const)("%i days → %s, «%s»", (days, status, label) => {
    expect(getFreshness(days)).toBe(status);
    expect(freshnessLabel(days, i18n)).toBe(label);
  });

  it("dayUnit agrees with the absolute value (for overdue days too)", () => {
    expect(dayUnit(-1, i18n)).toBe("день");
    expect(dayUnit(-3, i18n)).toBe("дні");
    expect(dayUnit(11, i18n)).toBe("днів");
  });
});

describe("formatQty", () => {
  it("whole numbers as is, decimals up to 3 places without float noise", () => {
    expect(formatQty({ quantity: 350, unit: "g" }, i18n)).toBe("350 г");
    expect(formatQty({ quantity: 1.5, unit: "l" }, i18n)).toBe("1.5 л");
    expect(formatQty({ quantity: 0.1 + 0.2, unit: "kg" }, i18n)).toBe("0.3 кг");
    expect(formatQty({ quantity: 2, unit: "pcs" }, i18n)).toBe("2 шт");
  });
});

describe("openedShelfLife (same rule as B-12)", () => {
  const dictionaries = {
    categories: [
      { code: "dairy", openedShelfLifeDays: 5 },
      { code: "meat", openedShelfLifeDays: 2 },
    ],
    openedShelfLifeRules: [{ category: "dairy", keywords: ["молоко", "вершки"], days: 3 }],
  } as unknown as Dictionaries;

  it("a keyword rule wins, then the category default, then 3 days", () => {
    expect(openedShelfLife(dictionaries, "dairy", "Молоко 2.5%")).toBe(3);
    expect(openedShelfLife(dictionaries, "dairy", "Сир Гауда")).toBe(5);
    expect(openedShelfLife(dictionaries, "meat", "Молоко?")).toBe(2);
    expect(openedShelfLife(dictionaries, "other", "Щось")).toBe(3);
  });
});
