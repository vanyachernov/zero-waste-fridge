import { createTranslator, getMessages } from "@zwf/i18n";
import { describe, expect, it } from "vitest";

/** Q-02: переклади, множина й дати. */
describe("i18n", () => {
  const uk = createTranslator("uk");

  it.each([
    [1, "продукт"],
    [2, "продукти"],
    [4, "продукти"],
    [5, "продуктів"],
    [11, "продуктів"],
    [12, "продуктів"],
    [21, "продукт"],
    [22, "продукти"],
    [25, "продуктів"],
    [0, "продуктів"],
    [111, "продуктів"],
  ])("plural(%i) → %s", (n, form) => {
    expect(uk.plural(n, ["продукт", "продукти", "продуктів"])).toBe(form);
  });

  it("t() fills params, keeps unknown placeholders and returns the key when missing", () => {
    expect(uk.t("fridge.statTotalHint", { n: 3 })).toBe("+3 за цей тиждень");
    expect(uk.t("fridge.statTotalHint")).toBe("+{n} за цей тиждень");
    expect(uk.t("fridge.nope" as never)).toBe("fridge.nope");
  });

  it("dates: full and short Ukrainian formats", () => {
    expect(uk.formatDate("2026-11-14")).toBe("14 лист. 2026 р.");
    expect(uk.formatShortDate("2026-11-14")).toBe("14 лист.");
  });

  it("English is partial: missing keys fall back to Ukrainian", () => {
    const en = createTranslator("en");
    expect(en.t("fridge.title")).toBe("My fridge");
    expect(en.t("fridge.statSoon")).toBe(getMessages("uk").fridge.statSoon);
    expect(en.plural(1, ["item", "items", "items"])).toBe("item");
    expect(en.plural(3, ["item", "items", "items"])).toBe("items");
  });
});
