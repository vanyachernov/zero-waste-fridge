import { ApiError } from "./http";
import { mockSessionUser, requireMockSession } from "./mock-auth";
import { addDays, mockFridgeControl } from "./mock-fridge";
import type {
  Category,
  MoveToFridgeRequest,
  MoveToFridgeResult,
  Product,
  ShoppingItem,
  ShoppingItemInput,
  ShoppingList,
  ShoppingSettings,
  ShoppingSource,
  ShoppingSummary,
  Store,
  Unit,
  WriteOffRequest,
} from "./types";

/**
 * In-memory список покупок, що поводиться як бекенд B-40…B-45: секції, сортування, валідація з тими
 * самими кодами, магазини, Smart Sync після списання, «Перенести в холодильник» (усе або нічого).
 * Паритет перевіряє `tests/web-lms/unit/api-client/mock-shopping.test.ts`.
 */

const delay = (ms = 100) => new Promise((r) => setTimeout(r, ms));
const EXTERNAL = "external";
const UNITS: Unit[] = ["g", "kg", "ml", "l", "pcs"];
const CATEGORIES: Category[] = ["vegetables", "dairy", "meat", "fruits", "sauces", "other"];

type Stored = Omit<ShoppingItem, "bought" | "store"> & { householdId: string; storeId: string | null };
type StoredStore = Store & { householdId: string };

let items: Stored[] = [];
let stores: StoredStore[] = [];
let settings = new Map<string, ShoppingSettings>();
let seq = 500;

const householdId = () => mockSessionUser()?.householdId ?? EXTERNAL;
const me = () => {
  const user = mockSessionUser();
  return user ? { id: user.id, name: user.name } : null;
};
const now = () => mockFridgeControl.now();
const collapse = (s: string) => s.trim().replace(/\s+/g, " ");

function validation(errors: Record<string, string>) {
  return new ApiError(400, "Request validation failed", { code: "VALIDATION_FAILED", fieldErrors: errors });
}

function view(i: Stored): ShoppingItem {
  const { householdId: _h, storeId, ...rest } = i;
  const store = storeId ? stores.find((s) => s.id === storeId) : undefined;
  return { ...rest, bought: i.boughtAt !== null, store: store ? { id: store.id, name: store.name } : null };
}

function seed() {
  const at = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString();
  const olena = { id: "u1", name: "Олена Кравченко" };
  const maksym = { id: "u2", name: "Максим Кравченко" };
  stores = [
    { id: "st1", name: "Сільпо", householdId: "h1" },
    { id: "st2", name: "Еко-лавка", householdId: "h1" },
    { id: "st3", name: "Пекарня", householdId: "h1" },
  ];
  const item = (id: string, name: string, extra: Partial<Stored>, minutesAgo: number): Stored => ({
    id, name, quantity: null, unit: null, category: null, priority: "NORMAL", priceEstimate: null, source: "MANUAL",
    sourceProduct: null, addedBy: olena, boughtAt: null, boughtBy: null, createdAt: at(minutesAgo), updatedAt: at(minutesAgo),
    householdId: "h1", storeId: null, ...extra,
  });
  const yesterday = new Date(Date.now() - 86_400_000).toISOString();
  items = [
    item("s1", "Шпинат Baby свіжий", { quantity: 150, unit: "g", category: "vegetables", source: "WRITE_OFF", storeId: "st1", sourceProduct: { id: "p-old-1", name: "Шпинат Baby свіжий", closedAt: yesterday } }, 600),
    item("s2", "Грецький йогурт 5%", { quantity: 2, unit: "pcs", category: "dairy", source: "AUTO", storeId: "st1", priceEstimate: 74, addedBy: null, sourceProduct: { id: "p-old-2", name: "Грецький йогурт 5%", closedAt: yesterday } }, 590),
    item("s3", "Куряче філе охолоджене", { quantity: 700, unit: "g", category: "meat", priority: "HIGH", addedBy: maksym, storeId: "st1" }, 580),
    item("s4", "Вівсяне рослинне молоко Barista", { quantity: 1, unit: "l", category: "other", storeId: "st2" }, 570),
    item("s5", "Яйця курячі органічні С0", { quantity: 10, unit: "pcs", category: "other", storeId: "st1" }, 560),
    item("s6", "Банани стиглі", { quantity: 1, unit: "kg", category: "fruits", source: "RECIPE" }, 550),
    item("s7", "Сіль морська харчова", { quantity: 1, unit: "pcs", category: "other", storeId: "st1", boughtAt: at(5), boughtBy: maksym }, 540),
    item("s8", "Мускатний горіх мелений", { quantity: 1, unit: "pcs", category: "other", storeId: "st1", boughtAt: at(6), boughtBy: maksym }, 530),
    item("s9", "Оливкова олія Extra Virgin", { quantity: 500, unit: "ml", category: "sauces", storeId: "st1", priceEstimate: 289, boughtAt: at(7), boughtBy: maksym }, 520),
    item("s10", "Хліб цільнозерновий на заквасці", { quantity: 1, unit: "pcs", category: "other", storeId: "st3", priceEstimate: 45, boughtAt: at(8), boughtBy: maksym }, 510),
  ];
  settings = new Map();
  seq = 500;
}

seed();

const TO_BUY = (a: Stored, b: Stored) => (a.priority === b.priority ? a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id) : a.priority === "HIGH" ? -1 : 1);
const BOUGHT = (a: Stored, b: Stored) => b.boughtAt!.localeCompare(a.boughtAt!) || a.id.localeCompare(b.id);

function find(id: string) {
  const item = items.find((i) => i.id === id && i.householdId === householdId());
  if (!item) throw new ApiError(404, "Shopping list item not found", { code: "SHOPPING_ITEM_NOT_FOUND" });
  return item;
}

const digits = (n: number, frac: number, int: number) => {
  const [a = "", b = ""] = String(n).split(".");
  return b.length <= frac && a.replace("-", "").length <= int;
};

/** Ті самі коди, що й ShoppingListService.Values. */
function validate(v: { name?: string | null; quantity?: number | null; unit?: Unit | null; priceEstimate?: number | null }) {
  const errors: Record<string, string> = {};
  if (v.name == null) errors.name = "NotNull";
  else if (!collapse(v.name)) errors.name = "NotBlank";
  else if (collapse(v.name).length > 120) errors.name = "Size";
  if (v.quantity != null) {
    if (!(v.quantity > 0)) errors.quantity = "Positive";
    else if (!digits(v.quantity, 3, 7)) errors.quantity = "Digits";
    else if (v.unit == null) errors.unit = "NotNull";
  } else if (v.unit != null) errors.quantity = "NotNull";
  if (v.priceEstimate != null) {
    if (v.priceEstimate < 0) errors.priceEstimate = "PositiveOrZero";
    else if (!digits(v.priceEstimate, 2, 8)) errors.priceEstimate = "Digits";
  }
  return errors;
}

function codeErrors(input: ShoppingItemInput) {
  const errors: Record<string, string> = {};
  if (input.unit != null && !UNITS.includes(input.unit)) errors.unit = "INVALID";
  if (input.category != null && !CATEGORIES.includes(input.category)) errors.category = "INVALID";
  if (input.priority != null && !["NORMAL", "HIGH"].includes(input.priority)) errors.priority = "INVALID";
  return errors;
}

function storeOf(storeId: string | null | undefined) {
  if (!storeId) return null;
  if (!stores.some((s) => s.id === storeId && s.householdId === householdId())) throw validation({ storeId: "INVALID" });
  return storeId;
}

function settingsOf(household: string): ShoppingSettings {
  return settings.get(household) ?? { autoRefill: true, excludedCategories: [] };
}

/** Позиція «купити ще раз»; та сама назва серед некуплених не дублюється. */
function addFromProduct(product: Product, source: ShoppingSource, quantity: number) {
  const household = householdId();
  if (items.some((i) => i.householdId === household && i.boughtAt === null && i.name.toLowerCase() === product.name.toLowerCase())) return;
  const at = now().toISOString();
  items.push({
    id: `s${++seq}`, name: product.name, quantity, unit: product.unit, category: product.category, priority: "NORMAL", priceEstimate: null,
    source, sourceProduct: { id: product.id, name: product.name, closedAt: product.status === "ACTIVE" ? null : at },
    addedBy: me(), boughtAt: null, boughtBy: null, createdAt: at, updatedAt: at, householdId: household, storeId: null,
  });
}

/** B-13 + B-43: що робить списання зі списком покупок (як ShoppingListService.afterWriteOff). */
function afterWriteOff(product: Product, written: number, request: WriteOffRequest): boolean {
  if (request.addToShoppingList) {
    addFromProduct(product, "WRITE_OFF", written);
    return true;
  }
  const s = settingsOf(householdId());
  if (product.status !== "ACTIVE" && s.autoRefill && !s.excludedCategories.includes(product.category)) {
    addFromProduct(product, "AUTO", written);
    return true;
  }
  return false;
}

mockFridgeControl.onWriteOff(afterWriteOff);

export const mockShopping = {
  async list(filter: { store?: string; fromFridge?: boolean } = {}): Promise<ShoppingList> {
    requireMockSession();
    await delay();
    const all = items
      .filter((i) => i.householdId === householdId())
      .filter((i) => !filter.store || i.storeId === filter.store)
      .filter((i) => !filter.fromFridge || i.source === "AUTO" || i.source === "WRITE_OFF");
    return {
      toBuy: all.filter((i) => i.boughtAt === null).sort(TO_BUY).map(view),
      bought: all.filter((i) => i.boughtAt !== null).sort(BOUGHT).map(view),
    };
  },

  async add(input: ShoppingItemInput): Promise<ShoppingItem> {
    requireMockSession();
    await delay();
    const codes = codeErrors(input);
    if (Object.keys(codes).length) throw validation(codes);
    const errors = validate(input);
    if (Object.keys(errors).length) throw validation(errors);
    const at = now().toISOString();
    const stored: Stored = {
      id: `s${++seq}`, name: collapse(input.name!), quantity: input.quantity ?? null, unit: input.unit ?? null, category: input.category ?? null,
      priority: input.priority ?? "NORMAL", priceEstimate: input.priceEstimate ?? null, source: "MANUAL", sourceProduct: null, addedBy: me(),
      boughtAt: null, boughtBy: null, createdAt: at, updatedAt: at, householdId: householdId(), storeId: storeOf(input.storeId),
    };
    items.push(stored);
    return view(stored);
  },

  async update(id: string, input: ShoppingItemInput): Promise<ShoppingItem> {
    requireMockSession();
    await delay(60);
    const item = find(id);
    const codes = codeErrors(input);
    if (Object.keys(codes).length) throw validation(codes);
    const has = (k: keyof ShoppingItemInput) => Object.prototype.hasOwnProperty.call(input, k);
    const merged = {
      name: has("name") ? input.name : item.name,
      quantity: has("quantity") ? (input.quantity ?? null) : item.quantity,
      unit: has("unit") ? (input.unit ?? null) : item.unit,
      priceEstimate: has("priceEstimate") ? (input.priceEstimate ?? null) : item.priceEstimate,
    };
    const errors = validate(merged);
    if (Object.keys(errors).length) throw validation(errors);
    Object.assign(item, merged, { name: collapse(merged.name!), updatedAt: now().toISOString() });
    if (has("category")) item.category = input.category ?? null;
    if (has("priority")) item.priority = input.priority ?? "NORMAL";
    if (has("storeId")) item.storeId = storeOf(input.storeId);
    return view(item);
  },

  async remove(id: string): Promise<void> {
    requireMockSession();
    await delay(60);
    const item = find(id);
    items = items.filter((i) => i !== item);
  },

  async toggle(id: string): Promise<ShoppingItem> {
    requireMockSession();
    await delay(40);
    const item = find(id);
    const at = now().toISOString();
    if (item.boughtAt) Object.assign(item, { boughtAt: null, boughtBy: null, updatedAt: at });
    else Object.assign(item, { boughtAt: at, boughtBy: me(), updatedAt: at });
    return view(item);
  },

  async clearBought(): Promise<{ deleted: number }> {
    requireMockSession();
    await delay(60);
    const before = items.length;
    items = items.filter((i) => !(i.householdId === householdId() && i.boughtAt !== null));
    return { deleted: before - items.length };
  },

  async moveToFridge(request: MoveToFridgeRequest = {}): Promise<MoveToFridgeResult> {
    requireMockSession();
    await delay();
    const household = householdId();
    const requested: NonNullable<MoveToFridgeRequest["items"]> =
      request.items ?? items.filter((i) => i.householdId === household && i.boughtAt).sort(BOUGHT).map((i) => ({ id: i.id }));
    const errors: Record<string, string> = {};
    if (request.items && request.items.length === 0) errors.items = "NotEmpty";
    const seen = new Set<string>();
    requested.forEach((entry, index) => {
      if (!entry.id) errors[`items[${index}].id`] = "NotNull";
      else if (seen.has(entry.id)) errors[`items[${index}].id`] = "DUPLICATE";
      seen.add(entry.id);
    });
    if (Object.keys(errors).length) throw validation(errors);

    const today = mockFridgeControl.today();
    // Спершу перевіряємо все — «усе або нічого», як транзакція на бекенді
    const plan = requested.map((entry, index) => {
      const item = find(entry.id);
      if (!item.boughtAt) throw new ApiError(409, "Only bought items can be moved to the fridge", { code: "ITEM_NOT_BOUGHT" });
      const category = entry.category ?? item.category ?? "other";
      const expiresAt = entry.expiresAt ?? addDays(today, mockFridgeControl.defaultShelfLifeDays(category));
      if (expiresAt < today) throw validation({ [`items[${index}].expiresAt`]: "BEFORE_PURCHASE" });
      return { item, category, expiresAt, zone: entry.zone };
    });
    const products = plan.map(({ item, category, expiresAt, zone }) => {
      items = items.filter((i) => i !== item);
      return mockFridgeControl.insert({
        name: item.name, category, zone, quantity: item.quantity ?? 1, unit: item.unit ?? "pcs", purchasedAt: today, expiresAt,
      });
    });
    return { moved: products.length, products };
  },

  async summary(): Promise<ShoppingSummary> {
    requireMockSession();
    await delay(40);
    const mine = items.filter((i) => i.householdId === householdId());
    return {
      bought: mine.filter((i) => i.boughtAt).length,
      total: mine.length,
      estimatedTotal: Math.round(mine.reduce((sum, i) => sum + (i.priceEstimate ?? 0), 0) * 100) / 100,
      autoCount: mine.filter((i) => !i.boughtAt && i.source === "AUTO").length,
    };
  },

  async getSettings(): Promise<ShoppingSettings> {
    requireMockSession();
    await delay(40);
    return settingsOf(householdId());
  },

  async putSettings(next: Partial<ShoppingSettings>): Promise<ShoppingSettings> {
    requireMockSession();
    await delay(60);
    if (next?.autoRefill == null) throw validation({ autoRefill: "NotNull" });
    const bad = (next.excludedCategories ?? []).findIndex((c) => !CATEGORIES.includes(c));
    if (bad >= 0) throw validation({ [`excludedCategories[${bad}]`]: "INVALID" });
    const excluded = CATEGORIES.filter((c) => next.excludedCategories?.includes(c));
    const saved = { autoRefill: next.autoRefill, excludedCategories: excluded };
    settings.set(householdId(), saved);
    return saved;
  },

  async stores(): Promise<Store[]> {
    requireMockSession();
    await delay(40);
    return stores
      .filter((s) => s.householdId === householdId())
      .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase(), "uk"))
      .map(({ id, name }) => ({ id, name }));
  },

  async addStore(rawName: string): Promise<Store> {
    requireMockSession();
    await delay(60);
    const name = rawName == null ? null : collapse(rawName);
    if (name === null) throw validation({ name: "NotNull" });
    if (!name) throw validation({ name: "NotBlank" });
    if (name.length > 60) throw validation({ name: "Size" });
    if (stores.some((s) => s.householdId === householdId() && s.name.toLowerCase() === name.toLowerCase())) {
      throw new ApiError(409, "Store with this name already exists", { code: "STORE_EXISTS", fieldErrors: { name: "STORE_EXISTS" } });
    }
    const store = { id: `st${++seq}`, name, householdId: householdId() };
    stores.push(store);
    return { id: store.id, name: store.name };
  },

  async removeStore(id: string): Promise<void> {
    requireMockSession();
    await delay(40);
    if (!stores.some((s) => s.id === id && s.householdId === householdId())) throw new ApiError(404, "Store not found", { code: "STORE_NOT_FOUND" });
    stores = stores.filter((s) => s.id !== id);
    items.forEach((i) => {
      if (i.storeId === id) i.storeId = null;
    });
  },
};

export const mockShoppingControl = {
  reset() {
    seed();
    mockFridgeControl.onWriteOff(afterWriteOff);
  },
};
