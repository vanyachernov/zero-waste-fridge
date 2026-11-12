import { api, configureApi, isApiError, mockAuthControl, mockFridgeControl, openedShelfLifeDays } from "@zwf/api-client";
import { beforeEach, describe, expect, it } from "vitest";

/** Мок холодильника має поводитися як бекенд B-10…B-16 (ті самі правила й коди), інакше UI розійдеться з API. */
const iso = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const codeOf = (p: Promise<unknown>) =>
  p.then(
    () => "ok",
    (e: unknown) => (isApiError(e) ? `${e.status} ${e.code ?? ""} ${JSON.stringify(e.fieldErrors)}`.trim() : String(e)),
  );

describe("mock fridge backend", () => {
  beforeEach(() => {
    configureApi({ mock: true });
    mockAuthControl.signIn();
  });

  it("requires a session like Spring Security", async () => {
    mockAuthControl.expireSession();
    expect(await codeOf(api.products.list())).toMatch(/^401/);
  });

  it("lists by urgency with pagination and category counts that ignore the chosen category", async () => {
    const first = await api.products.list({ size: 4 });
    expect(first).toMatchObject({ page: 1, size: 4, total: 11, totalPages: 3 });
    expect(first.items.map((p) => p.name)).toEqual(["Фарш яловичий свіжий", "Шпинат Baby свіжий", "Грецький йогурт 5%", "Філе куряче охолоджене"]);
    expect(first.items.map((p) => p.freshness)).toEqual(["expired", "today", "soon", "soon"]);

    const dairy = await api.products.list({ category: ["dairy"] });
    expect(dairy.items.every((p) => p.category === "dairy")).toBe(true);
    expect(dairy.categoryCounts).toEqual({ vegetables: 3, dairy: 3, meat: 2, fruits: 1, sauces: 1, other: 1 });

    expect((await api.products.list({ q: "ГАЛИЧ" })).items.map((p) => p.name)).toEqual(["Грецький йогурт 5%"]);
    expect((await api.products.list({ freshness: ["expired", "today"] })).total).toBe(2);
    expect((await api.products.list({ sort: "name", size: 2 })).items.map((p) => p.name)).toEqual(["Авокадо Хаас стигле", "Грецький йогурт 5%"]);
    expect(await codeOf(api.products.list({ page: 0, size: 500 }))).toBe('400 VALIDATION_FAILED {"page":"Min","size":"Range"}');
  });

  it("opened package shortens expiry with the same rules as B-12", async () => {
    expect(openedShelfLifeDays("dairy", "Грецький йогурт")).toBe(5);
    expect(openedShelfLifeDays("dairy", "Масло вершкове")).toBe(14);
    expect(openedShelfLifeDays("meat", "Філе")).toBe(2);

    const milk = await api.products.create({ name: "  Молоко   2.5% ", category: "dairy", quantity: 1, unit: "l", expiresAt: iso(10), openedAt: iso(0) });
    expect(milk).toMatchObject({ name: "Молоко 2.5%", zone: "middle", remindBeforeDays: 2, openedShelfLifeDays: 3, effectiveExpiresAt: iso(3), daysLeft: 3, freshness: "fresh" });
    expect(milk.addedBy).toEqual({ id: "u1", name: "Олена Кравченко" });

    const unopened = await api.products.update(milk.id, { openedAt: null });
    expect(unopened).toMatchObject({ openedAt: null, openedShelfLifeDays: null, effectiveExpiresAt: iso(10) });
  });

  it("validates with backend field codes", async () => {
    expect(await codeOf(api.products.create({ name: " ", quantity: 0, remindBeforeDays: 4 }))).toBe(
      '400 VALIDATION_FAILED {"name":"NotBlank","category":"NotNull","zone":"NotNull","unit":"NotNull","expiresAt":"NotNull","quantity":"Positive","remindBeforeDays":"NOT_ALLOWED"}',
    );
    expect(await codeOf(api.products.create({ name: "Сир", category: "dairy", quantity: 1, unit: "pcs", purchasedAt: iso(1), expiresAt: iso(5) }))).toBe(
      '400 VALIDATION_FAILED {"purchasedAt":"IN_FUTURE"}',
    );
    expect(await codeOf(api.products.update("p3", { expiresAt: iso(-10) }))).toBe('400 VALIDATION_FAILED {"expiresAt":"BEFORE_PURCHASE"}');
    expect(await codeOf(api.products.get("nope"))).toBe("404 PRODUCT_NOT_FOUND {}");
  });

  it("writes off partly, then fully, then refuses", async () => {
    const part = await api.products.writeOff("p3", { outcome: "EATEN", quantity: 100 });
    expect(part).toMatchObject({ writtenOff: { quantity: 100, unit: "g", closed: false }, addedToShoppingList: false, product: { quantity: 250, status: "ACTIVE" } });

    const rest = await api.products.writeOff("p3", { outcome: "WASTED", addToShoppingList: true });
    expect(rest).toMatchObject({ writtenOff: { quantity: 250, closed: true }, addedToShoppingList: true, product: { status: "WASTED" } });
    expect((await api.products.list()).total).toBe(10);
    expect((await api.products.list({ status: "WASTED" })).items.map((p) => p.id)).toEqual(["p3"]);

    expect(await codeOf(api.products.writeOff("p3", { outcome: "EATEN" }))).toBe("409 PRODUCT_CLOSED {}");
    expect(await codeOf(api.products.writeOff("p4", { outcome: "EATEN", quantity: 9999 }))).toBe('400 VALIDATION_FAILED {"quantity":"EXCEEDS_REMAINING"}');
  });

  it("summary, tip of the day and dictionaries", async () => {
    expect(await api.products.summary()).toEqual({ total: 11, addedThisWeek: 11, soon: 3, today: 1, expired: 1 });

    const tip = await api.tips.today();
    expect(tip).toMatchObject({ kind: "USE_SOON", hint: "SALAD" });
    expect(tip.products.map((p) => p.name)).toEqual(["Шпинат Baby свіжий", "Грецький йогурт 5%"]);

    const dictionaries = await api.dictionaries.get();
    expect(dictionaries.categories.find((c) => c.code === "meat")).toEqual({ code: "meat", defaultZone: "fresh", defaultShelfLifeDays: 3, openedShelfLifeDays: 2 });
    expect(dictionaries.remindBeforeDays).toEqual([1, 2, 3, 7]);
  });

  it("each household sees only its own fridge", async () => {
    await api.auth.register({ name: "Максим Кравченко", email: "max@zwf.app", password: "Secret-pass-1" });
    expect((await api.products.list()).total).toBe(0);
    expect(await codeOf(api.products.get("p1"))).toBe("404 PRODUCT_NOT_FOUND {}");
    expect(mockFridgeControl.all()).toHaveLength(0);
  });
});
