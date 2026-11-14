import { api, configureApi, DEMO_ACCOUNT, isApiError } from "@zwf/api-client";
import { beforeEach, describe, expect, it } from "vitest";
import { kilograms } from "../../../../packages/api-client/src/mock-stats";

/** B-200 на моках — ті самі правила, що StatsService на бекенді. */
describe("mock stats overview", () => {
  beforeEach(async () => {
    configureApi({ mock: true });
    await api.auth.login({ email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password, rememberMe: false });
  });

  it("demo history: months, categories, most wasted and the family", async () => {
    const o = await api.stats.overview(6);
    expect(o.months).toHaveLength(6);
    // Демо-історія: сім'я викидає дедалі менше
    expect(o.months.slice(0, 5).map((m) => [m.saved, m.wasted])).toEqual([
      [2, 3],
      [4, 2],
      [5, 1],
      [6, 1],
      [7, 1],
    ]);
    expect(o.topWasted[0]).toMatchObject({ name: "Молоко 2.5%", times: 3, quantity: 3, unit: "l" });
    expect(o.byCategory[0]!.category).toBe("dairy");
    expect(o.current.month).toBe(o.months.at(-1)!.month);

    expect((await api.stats.overview(3)).months).toHaveLength(3);
    await expect(api.stats.overview(13)).rejects.toSatisfy((e) => isApiError(e, 400));
  });

  it("current month counts write-offs with weight and CO₂e", async () => {
    const before = (await api.stats.overview(1)).current;
    await api.products.writeOff("p4", { outcome: "COOKED" }); // 650 г філе — м'ясо, 20 кг CO₂e/кг
    await api.products.writeOff("p9", { outcome: "WASTED" }); // 6 яєць × 0.3 кг

    const c = (await api.stats.overview(1)).current;
    expect(c.saved).toBe(before.saved + 1);
    expect(c.wasted).toBe(before.wasted + 1);
    expect(c.savedKg).toBeCloseTo(before.savedKg + 0.65, 0) // підсумки округлено до 0.1 кг;
    expect(c.co2SavedKg).toBeCloseTo(before.co2SavedKg + 13, 0);
    expect(c.wastedKg).toBeCloseTo(before.wastedKg + 1.8, 0);
    expect(c.saveRate).toBe(Math.round((100 * c.saved) / (c.saved + c.wasted)));
  });

  it("kilograms: grams, litres and pieces by category", () => {
    expect(kilograms(250, "g", "dairy")).toBe(0.25);
    expect(kilograms(2, "l", "dairy")).toBe(2);
    expect(kilograms(4, "pcs", "fruits")).toBeCloseTo(0.8);
    expect(kilograms(null, null, "other")).toBe(0);
  });
});
