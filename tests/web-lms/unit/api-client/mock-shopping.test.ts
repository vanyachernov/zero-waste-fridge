import { api, configureApi, isApiError, mockAuthControl } from "@zwf/api-client";
import { beforeEach, describe, expect, it } from "vitest";

/** Мок списку покупок дзеркалить B-40…B-45. */
const codeOf = (p: Promise<unknown>) =>
  p.then(
    () => "ok",
    (e: unknown) => (isApiError(e) ? `${e.status} ${e.code ?? ""} ${JSON.stringify(e.fieldErrors)}`.trim() : String(e)),
  );

describe("mock shopping list backend", () => {
  beforeEach(() => {
    configureApi({ mock: true });
    mockAuthControl.signIn();
  });

  it("sections: high priority first, then oldest; bought newest first", async () => {
    const list = await api.shoppingList.get();
    expect(list.toBuy.map((i) => i.name)[0]).toBe("Куряче філе охолоджене");
    expect(list.toBuy).toHaveLength(6);
    expect(list.bought.map((i) => i.name)).toEqual(["Сіль морська харчова", "Мускатний горіх мелений", "Оливкова олія Extra Virgin", "Хліб цільнозерновий на заквасці"]);
    expect((await api.shoppingList.get({ fromFridge: true })).toBuy.map((i) => i.source)).toEqual(["WRITE_OFF", "AUTO"]);
  });

  it("validates like the backend and keeps quantity with unit", async () => {
    expect(await codeOf(api.shoppingList.add({ name: " ", quantity: 1 }))).toBe('400 VALIDATION_FAILED {"name":"NotBlank","unit":"NotNull"}');
    expect(await codeOf(api.shoppingList.add({ name: "Хліб", storeId: "nope" }))).toBe('400 VALIDATION_FAILED {"storeId":"INVALID"}');
    const bread = await api.shoppingList.add({ name: "  Хліб  житній " });
    expect(bread).toMatchObject({ name: "Хліб житній", quantity: null, unit: null, source: "MANUAL", bought: false, addedBy: { id: "u1" } });

    const updated = await api.shoppingList.update(bread.id, { quantity: 2, unit: "pcs", priority: "HIGH", storeId: "st1" });
    expect(updated).toMatchObject({ quantity: 2, priority: "HIGH", store: { id: "st1", name: "Сільпо" } });
    expect((await api.shoppingList.get()).toBuy[0]!.name).toBe("Куряче філе охолоджене");
  });

  it("toggle, clear bought and summary", async () => {
    const toggled = await api.shoppingList.toggle("s4");
    expect(toggled).toMatchObject({ bought: true, boughtBy: { id: "u1" } });
    expect(await api.shoppingList.summary()).toEqual({ bought: 5, total: 10, estimatedTotal: 408, autoCount: 1 });
    expect(await api.shoppingList.clearBought()).toEqual({ deleted: 5 });
    expect((await api.shoppingList.get()).bought).toHaveLength(0);
  });

  it("write-off with the flag or Smart Sync adds to the list once", async () => {
    await api.products.writeOff("p3", { outcome: "EATEN", quantity: 100 });
    expect((await api.shoppingList.get()).toBuy.filter((i) => i.name === "Грецький йогурт 5%")).toHaveLength(1);

    const milk = await api.products.writeOff("p6", { outcome: "EATEN" });
    expect(milk.addedToShoppingList).toBe(true);
    expect((await api.shoppingList.get()).toBuy.find((i) => i.name === "Молоко пастеризоване 2.5%")).toMatchObject({ source: "AUTO" });

    await api.shoppingList.saveSettings({ autoRefill: true, excludedCategories: ["meat"] });
    expect((await api.products.writeOff("p4", { outcome: "EATEN" })).addedToShoppingList).toBe(false);
    expect((await api.products.writeOff("p1", { outcome: "WASTED", addToShoppingList: true })).addedToShoppingList).toBe(true);
    expect(await api.shoppingList.settings()).toEqual({ autoRefill: true, excludedCategories: ["meat"] });
  });

  it("moves bought items to the fridge all or nothing", async () => {
    expect(await codeOf(api.shoppingList.moveToFridge({ items: [{ id: "s7" }, { id: "s1" }] }))).toBe("409 ITEM_NOT_BOUGHT {}");
    expect(await codeOf(api.shoppingList.moveToFridge({ items: [{ id: "s7", expiresAt: "2000-01-01" }] }))).toBe(
      '400 VALIDATION_FAILED {"items[0].expiresAt":"BEFORE_PURCHASE"}',
    );
    expect((await api.shoppingList.get()).bought).toHaveLength(4);

    const result = await api.shoppingList.moveToFridge();
    expect(result.moved).toBe(4);
    expect(result.products.find((p) => p.name === "Оливкова олія Extra Virgin")).toMatchObject({ quantity: 500, unit: "ml", category: "sauces", zone: "door", daysLeft: 90 });
    expect((await api.shoppingList.get()).bought).toHaveLength(0);
    expect((await api.products.list({ q: "олія" })).total).toBe(1);
  });

  it("stores are unique per household and deleting keeps items", async () => {
    expect(await codeOf(api.shoppingList.addStore("сільпо"))).toBe('409 STORE_EXISTS {"name":"STORE_EXISTS"}');
    const atb = await api.shoppingList.addStore(" АТБ ");
    expect((await api.shoppingList.stores()).map((s) => s.name)).toEqual(["АТБ", "Еко-лавка", "Пекарня", "Сільпо"]);
    await api.shoppingList.removeStore("st1");
    expect((await api.shoppingList.get()).toBuy.find((i) => i.id === "s1")!.store).toBeNull();
    expect(atb.name).toBe("АТБ");
  });
});
