import { api, configureApi, convertQuantity, DEMO_ACCOUNT, isApiError } from "@zwf/api-client";
import { beforeEach, describe, expect, it } from "vitest";

/** Мок рецептів має поводитися як бекенд (RecipeIT): той самий каталог, підбір, порції, коди помилок. */
describe("mock recipes backend", () => {
  beforeEach(async () => {
    configureApi({ mock: true });
    await api.auth.login({ email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password, rememberMe: false });
  });

  const codeOf = (promise: Promise<unknown>) =>
    promise.then(
      () => "ok",
      (e: unknown) => (isApiError(e) ? `${e.status} ${e.code ?? ""} ${JSON.stringify(e.fieldErrors ?? {})}`.trim() : "?"),
    );

  it("recommended: critical products first, expired mince never used, sorting by time", async () => {
    const cards = await api.recipes.recommended();
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.length).toBeLessThanOrEqual(6);
    expect(cards[0]!.criticalCount).toBeGreaterThanOrEqual(2);
    expect(cards.flatMap((c) => c.fromFridge.map((f) => f.productId))).not.toContain("p1");

    const byTime = await api.recipes.recommended("time", 4);
    expect(byTime).toHaveLength(4);
    expect(byTime.map((c) => c.minutes)).toEqual([...byTime.map((c) => c.minutes)].sort((a, b) => a - b));
  });

  it("generate picks the catalog recipe that uses the selected products and validates", async () => {
    const recipe = await api.recipes.generate(["p2", "p3", "p8"]);
    expect(recipe.title).toBe("Теплий кіш без тіста зі шпинатом, йогуртом та сиром Гауда");
    expect(recipe.source).toBe("CATALOG");
    expect(recipe.fromFridge.map((f) => f.productId)).toEqual(expect.arrayContaining(["p2", "p3", "p8"]));
    expect(recipe.missing.map((m) => m.name)).toEqual(["Мускатний горіх"]);
    expect(recipe.pantry.length).toBeGreaterThan(0);
    expect(await api.recipes.get(recipe.id)).toEqual(recipe);

    expect(await codeOf(api.recipes.generate(["p2", "p3"]))).toBe('400 VALIDATION_FAILED {"productIds":"Size"}');
    expect(await codeOf(api.recipes.generate(["p1", "p2", "p3"]))).toBe('400 VALIDATION_FAILED {"productIds":"INVALID"}');
    expect(await codeOf(api.recipes.get("nope"))).toBe("404 RECIPE_NOT_FOUND {}");
  });

  it("cook writes off scaled quantities as COOKED and counts them as saved", async () => {
    const before = await api.stats.saved();
    const recipe = await api.recipes.generate(["p2", "p3", "p8"]);

    const result = await api.recipes.cook(recipe.id, { portions: 2, productIds: ["p3", "p8", "p2"] });

    const byId = Object.fromEntries(result.cooked.map((c) => [c.productId, c]));
    expect(byId.p2).toMatchObject({ quantity: 75, unit: "g", closed: false });
    expect(byId.p3).toMatchObject({ quantity: 100, unit: "g", closed: false });
    expect(byId.p8).toMatchObject({ quantity: 50, unit: "g", closed: false });
    expect((await api.products.get("p2")).quantity).toBe(75);
    expect((await api.stats.saved()).saved).toBe(before.saved + 3);

    expect(await codeOf(api.recipes.cook(recipe.id, { portions: 13 }))).toBe('400 VALIDATION_FAILED {"portions":"Range"}');
  });

  it("convertQuantity: grams ↔ kilograms, millilitres ↔ litres, pieces only to pieces", () => {
    expect(convertQuantity(200, "g", "kg")).toBe(0.2);
    expect(convertQuantity(1.5, "l", "ml")).toBe(1500);
    expect(convertQuantity(3, "pcs", "pcs")).toBe(3);
    expect(convertQuantity(3, "pcs", "g")).toBeNull();
    expect(convertQuantity(null, "g", "g")).toBeNull();
  });
});
