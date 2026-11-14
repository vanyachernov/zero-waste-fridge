import { ApiError } from "./http";
import { requireMockSession } from "./mock-auth";
import { mockFridgeControl } from "./mock-fridge";
import type { Category, StatsOverview, Unit } from "./types";

/** In-memory B-200 — ті самі правила, що StatsService / FoodFootprint на бекенді. */

const PIECE_KG: Record<Category, number> = { meat: 0.5, dairy: 0.4, vegetables: 0.3, fruits: 0.2, sauces: 0.25, other: 0.3 };
const CO2_PER_KG: Record<Category, number> = { meat: 20, dairy: 3, vegetables: 1.5, fruits: 1, sauces: 2, other: 2 };

export function kilograms(quantity: number | null, unit: Unit | null, category: Category): number {
  if (quantity === null || unit === null) return 0;
  if (unit === "g" || unit === "ml") return quantity / 1000;
  if (unit === "kg" || unit === "l") return quantity;
  return quantity * PIECE_KG[category];
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const iso = (d: Date) => `${monthKey(d)}-${String(d.getDate()).padStart(2, "0")}`;

export async function mockStatsOverview(householdId: string, months = 6): Promise<StatsOverview> {
  requireMockSession();
  await new Promise((r) => setTimeout(r, 200));
  if (!Number.isInteger(months) || months < 1 || months > 12) {
    throw new ApiError(400, "Request validation failed", { code: "VALIDATION_FAILED", fieldErrors: { months: "Range" } });
  }
  const now = mockFridgeControl.now();
  const first = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const categoryOf = new Map(mockFridgeControl.all().map((p) => [p.id, p.category]));
  const rows = mockFridgeControl
    .events(householdId)
    .filter((e) => e.type === "WRITTEN_OFF" && new Date(e.at) >= first && new Date(e.at) < end)
    .map((e) => ({ ...e, category: (categoryOf.get(e.productId) ?? "other") as Category, saved: e.outcome !== "WASTED" }));

  const keys: string[] = [];
  for (let m = 0; m < months; m++) keys.push(monthKey(new Date(first.getFullYear(), first.getMonth() + m, 1)));
  const distinct = (list: typeof rows, saved: boolean) => new Set(list.filter((r) => r.saved === saved).map((r) => r.productId)).size;
  const inMonth = (key: string) => rows.filter((r) => monthKey(new Date(r.at)) === key);

  const current = inMonth(keys.at(-1)!);
  const saved = distinct(current, true);
  const wasted = distinct(current, false);
  const sum = (list: typeof rows, fn: (r: (typeof rows)[number]) => number) => round1(list.reduce((a, r) => a + fn(r), 0));
  const kg = (r: (typeof rows)[number]) => kilograms(r.quantity, r.unit, r.category);

  const byCategory = new Map<Category, { saved: Set<string>; wasted: Set<string> }>();
  for (const r of rows) {
    const c = byCategory.get(r.category) ?? { saved: new Set(), wasted: new Set() };
    (r.saved ? c.saved : c.wasted).add(r.productId);
    byCategory.set(r.category, c);
  }
  const wastedByName = new Map<string, { name: string; times: number; quantity: number; unit: Unit | null; mixed: boolean }>();
  for (const r of rows.filter((x) => !x.saved)) {
    const key = r.productName.trim().toLowerCase();
    const w = wastedByName.get(key) ?? { name: r.productName, times: 0, quantity: 0, unit: r.unit, mixed: false };
    w.times++;
    if (r.unit !== w.unit) w.mixed = true;
    else w.quantity += r.quantity ?? 0;
    wastedByName.set(key, w);
  }
  const members = new Map<string, { userId: string; name: string; products: Set<string> }>();
  for (const r of current.filter((x) => x.saved && x.actor)) {
    const m = members.get(r.actor!.id) ?? { userId: r.actor!.id, name: r.actor!.name, products: new Set() };
    m.products.add(r.productId);
    members.set(r.actor!.id, m);
  }

  return {
    from: iso(first),
    to: iso(new Date(end.getTime() - 86_400_000)),
    months: keys.map((month) => ({ month, saved: distinct(inMonth(month), true), wasted: distinct(inMonth(month), false) })),
    current: {
      month: keys.at(-1)!,
      saved,
      wasted,
      saveRate: saved + wasted ? Math.round((100 * saved) / (saved + wasted)) : null,
      savedKg: sum(current.filter((r) => r.saved), kg),
      wastedKg: sum(current.filter((r) => !r.saved), kg),
      co2SavedKg: sum(current.filter((r) => r.saved), (r) => kg(r) * CO2_PER_KG[r.category]),
      co2WastedKg: sum(current.filter((r) => !r.saved), (r) => kg(r) * CO2_PER_KG[r.category]),
    },
    byCategory: [...byCategory.entries()]
      .map(([category, c]) => ({ category, saved: c.saved.size, wasted: c.wasted.size }))
      .sort((a, b) => b.saved + b.wasted - (a.saved + a.wasted)),
    topWasted: [...wastedByName.values()]
      .sort((a, b) => b.times - a.times || a.name.localeCompare(b.name))
      .slice(0, 5)
      .map((w) => ({ name: w.name, times: w.times, quantity: w.mixed ? null : Math.round(w.quantity * 1000) / 1000, unit: w.mixed ? null : w.unit })),
    members: [...members.values()]
      .map((m) => ({ userId: m.userId, name: m.name, saved: m.products.size }))
      .sort((a, b) => b.saved - a.saved || a.name.localeCompare(b.name)),
  };
}
