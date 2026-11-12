import { ApiError } from "./http";
import { mockSessionUser, requireMockSession } from "./mock-auth";
import type {
  Category,
  Dictionaries,
  Freshness,
  Product,
  ProductInput,
  ProductPage,
  ProductQuery,
  ProductSummary,
  StorageZone,
  Tip,
  Unit,
  WriteOffRequest,
  WriteOffResult,
} from "./types";

/**
 * In-memory холодильник, що поводиться як бекенд B-10…B-16: ті самі фільтри, сортування, пагінація,
 * терміни після відкриття упаковки, коди помилок полів і списання. Тести перевіряють паритет
 * (`tests/web-lms/unit/api-client/mock-fridge.test.ts`), інакше UI на моках розійдеться з реальним API.
 */

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));
const DAY = 86_400_000;

// ---------- Довідники (дзеркало Dictionaries.java / OpenedShelfLife.java) ----------

const CATEGORIES: Category[] = ["vegetables", "dairy", "meat", "fruits", "sauces", "other"];
const DEFAULT_ZONE: Record<Category, StorageZone> = { vegetables: "fresh", dairy: "middle", meat: "fresh", fruits: "fresh", sauces: "door", other: "middle" };
const SHELF_LIFE: Record<Category, number> = { vegetables: 7, dairy: 7, meat: 3, fruits: 5, sauces: 90, other: 14 };
const OPENED_DAYS: Record<Category, number> = { vegetables: 3, dairy: 4, meat: 2, fruits: 3, sauces: 30, other: 5 };
const OPENED_RULES: Dictionaries["openedShelfLifeRules"] = [
  { category: "dairy", keywords: ["гауда", "пармезан", "чедер", "сир твердий", "масло"], days: 14 },
  { category: "dairy", keywords: ["моцарел", "буррат", "рікот"], days: 2 },
  { category: "dairy", keywords: ["йогурт", "сметан"], days: 5 },
  { category: "dairy", keywords: ["молоко", "вершки", "кефір", "ряжанк"], days: 3 },
  { category: "meat", keywords: ["фарш"], days: 1 },
  { category: "meat", keywords: ["ковбас", "шинк", "бекон"], days: 5 },
  { category: "vegetables", keywords: ["шпинат", "салат", "зелень", "рукол"], days: 2 },
  { category: "fruits", keywords: ["полуниц", "малин", "ягод", "лохин"], days: 2 },
  { category: "sauces", keywords: ["песто"], days: 7 },
  { category: "sauces", keywords: ["майонез"], days: 14 },
  { category: "other", keywords: ["сік", "смузі"], days: 3 },
  { category: "other", keywords: ["хумус"], days: 4 },
];

export const MOCK_DICTIONARIES: Dictionaries = {
  categories: CATEGORIES.map((code) => ({
    code,
    defaultZone: DEFAULT_ZONE[code],
    defaultShelfLifeDays: SHELF_LIFE[code],
    openedShelfLifeDays: OPENED_DAYS[code],
  })),
  zones: [
    { code: "fresh", minTemperatureC: 0, maxTemperatureC: 2 },
    { code: "middle", minTemperatureC: 4, maxTemperatureC: 6 },
    { code: "door", minTemperatureC: 6, maxTemperatureC: 8 },
    { code: "freezer", minTemperatureC: -18, maxTemperatureC: -18 },
  ],
  units: [
    { code: "g", kind: "mass" },
    { code: "kg", kind: "mass" },
    { code: "ml", kind: "volume" },
    { code: "l", kind: "volume" },
    { code: "pcs", kind: "count" },
  ],
  remindBeforeDays: [1, 2, 3, 7],
  defaultRemindBeforeDays: 2,
  openedShelfLifeRules: OPENED_RULES,
};

/** Те саме правило, що й на бекенді: ключові слова в назві, інакше типовий термін категорії. */
export function openedShelfLifeDays(category: Category, name: string): number {
  const lower = name.toLowerCase();
  return OPENED_RULES.find((r) => r.category === category && r.keywords.some((k) => lower.includes(k)))?.days ?? OPENED_DAYS[category];
}

// ---------- Дати ----------

/** Локальна календарна дата `YYYY-MM-DD` (у тестах і в браузері — пояс користувача). */
export function isoDate(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
export const addDays = (iso: string, days: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  return isoDate(new Date(y!, m! - 1, d! + days));
};
const daysBetween = (from: string, to: string) => {
  const [a, b] = [from, to].map((s) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y!, m! - 1, d!);
  });
  return Math.round((b! - a!) / DAY);
};
export const freshnessOf = (daysLeft: number): Freshness => (daysLeft < 0 ? "expired" : daysLeft === 0 ? "today" : daysLeft <= 2 ? "soon" : "fresh");

// ---------- Стан ----------

type Stored = Omit<Product, "daysLeft" | "freshness" | "effectiveExpiresAt"> & { householdId: string };

const EXTERNAL_HOUSEHOLD = "external";
let products: Stored[] = [];

/** Журнал дій для стрічки «Остання дія» (B-53), як product_event на бекенді. */
export interface MockProductEvent {
  type: "ADDED" | "UPDATED" | "OPENED" | "WRITTEN_OFF";
  at: string;
  actor: { id: string; name: string } | null;
  productId: string;
  productName: string;
  outcome: WriteOffRequest["outcome"] | null;
  quantity: number | null;
  unit: Unit | null;
  householdId: string;
}
let events: MockProductEvent[] = [];

function log(type: MockProductEvent["type"], p: Stored, extra: Partial<MockProductEvent> = {}) {
  events.push({ type, at: clock().toISOString(), actor: author(), productId: p.id, productName: p.name, outcome: null, quantity: null, unit: null, householdId: p.householdId, ...extra });
}
let seq = 100;
let clock = () => new Date();

export type WriteOffHook = (product: Product, written: number, request: WriteOffRequest) => boolean;
let writeOffHook: WriteOffHook = (_, __, request) => Boolean(request.addToShoppingList);

function householdId() {
  return mockSessionUser()?.householdId ?? EXTERNAL_HOUSEHOLD;
}

function author() {
  const user = mockSessionUser();
  return user ? { id: user.id, name: user.name } : null;
}

function effective(p: Stored) {
  if (!p.openedAt || !p.openedShelfLifeDays) return p.expiresAt;
  const afterOpening = addDays(p.openedAt, p.openedShelfLifeDays);
  return afterOpening < p.expiresAt ? afterOpening : p.expiresAt;
}

function view(p: Stored): Product {
  const { householdId: _household, ...rest } = p;
  const effectiveExpiresAt = effective(p);
  const daysLeft = daysBetween(isoDate(clock()), effectiveExpiresAt);
  return { ...rest, effectiveExpiresAt, daysLeft, freshness: freshnessOf(daysLeft) };
}

function seed() {
  const today = isoDate(clock());
  // Демо-продукти додано позавчора (крім кількох нижче) — щоб «Остання дія» в сім'ї була правдоподібною
  const at = new Date(clock().getTime() - 2 * DAY).toISOString();
  const demo = { id: "u1", name: "Олена Кравченко" };
  const make = (id: string, name: string, brand: string | null, category: Category, zone: StorageZone, quantity: number, unit: Unit, days: number, extra: Partial<Stored> = {}): Stored => ({
    id, name, brand, category, zone, quantity, unit, purchasedAt: addDays(today, -2), expiresAt: addDays(today, days), openedAt: null,
    openedShelfLifeDays: null, remindBeforeDays: 2, status: "ACTIVE", addedBy: demo, createdAt: at, updatedAt: at, householdId: "h1", ...extra,
  });
  products = [
    make("p1", "Фарш яловичий свіжий", "Фермерська м'ясо, охолоджене", "meat", "fresh", 500, "g", -1),
    make("p2", "Шпинат Baby свіжий", "Органічна зелень, митий", "vegetables", "fresh", 150, "g", 0),
    make("p3", "Грецький йогурт 5%", "ТМ Галичина, банка", "dairy", "door", 350, "g", 1),
    make("p4", "Філе куряче охолоджене", "Еко-пакування", "meat", "fresh", 650, "g", 2),
    make("p5", "Полуниця солодка", "Лоток, локальний збір", "fruits", "fresh", 300, "g", 4),
    make("p6", "Молоко пастеризоване 2.5%", "Скляна пляшка багаторазова", "dairy", "door", 1, "l", 5),
    make("p7", "Авокадо Хаас стигле", "Ready-to-eat", "vegetables", "middle", 2, "pcs", 7),
    make("p8", "Сир твердий Гауда 45%", "Брусок у вощеній упаковці", "dairy", "middle", 320, "g", 14),
    make("p9", "Яйця фермерські С0", "10 шт", "other", "door", 6, "pcs", 4),
    make("p10", "Кабачки / Цукіні", "Місцевий фермер", "vegetables", "fresh", 2, "pcs", 3),
    make("p11", "Соус песто", "Скляна банка", "sauces", "door", 90, "g", 20, { openedAt: addDays(today, -1), openedShelfLifeDays: 7 }),
  ];
  // Хто що додав — для «Останньої дії» учасників демо-сім'ї
  const maksym = { id: "u2", name: "Максим Кравченко" };
  const sofia = { id: "u3", name: "Софія Кравченко" };
  const ago = (minutes: number) => new Date(clock().getTime() - minutes * 60_000).toISOString();
  products.find((p) => p.id === "p6")!.createdAt = ago(10);
  products.find((p) => p.id === "p8")!.addedBy = maksym;
  products.find((p) => p.id === "p8")!.createdAt = ago(180);
  events = products.map((p) => ({
    type: "ADDED" as const, at: p.createdAt, actor: p.addedBy, productId: p.id, productName: p.name, outcome: null, quantity: null, unit: null, householdId: p.householdId,
  }));
  events.push({ type: "WRITTEN_OFF", at: ago(26 * 60), actor: sofia, productId: "p-old-2", productName: "Грецький йогурт 5%", outcome: "EATEN", quantity: 350, unit: "g", householdId: "h1" });
  seq = 100;
}

seed();

function notFound() {
  return new ApiError(404, "Product not found", { code: "PRODUCT_NOT_FOUND" });
}

function validation(errors: Record<string, string>) {
  return new ApiError(400, "Request validation failed", { code: "VALIDATION_FAILED", fieldErrors: errors });
}

function find(id: string) {
  const p = products.find((x) => x.id === id && x.householdId === householdId());
  if (!p) throw notFound();
  return p;
}

const collapse = (s: string) => s.trim().replace(/\s+/g, " ");
const digitsOk = (n: number) => {
  const [int = "", frac = ""] = String(n).split(".");
  return frac.length <= 3 && int.replace("-", "").length <= 7;
};

/** Перевірка злитих значень — ті самі коди, що в ProductService.Values. */
function validate(v: Partial<Stored>, today: string): Record<string, string> {
  const errors: Record<string, string> = {};
  if (v.name == null) errors.name = "NotNull";
  else if (!collapse(v.name)) errors.name = "NotBlank";
  else if (collapse(v.name).length > 120) errors.name = "Size";
  if (v.brand && collapse(v.brand).length > 120) errors.brand = "Size";
  for (const field of ["category", "zone", "unit", "expiresAt"] as const) if (v[field] == null) errors[field] = "NotNull";
  if (v.quantity == null) errors.quantity = "NotNull";
  else if (!(v.quantity > 0)) errors.quantity = "Positive";
  else if (!digitsOk(v.quantity)) errors.quantity = "Digits";
  if (v.remindBeforeDays == null) errors.remindBeforeDays = "NotNull";
  else if (![1, 2, 3, 7].includes(v.remindBeforeDays)) errors.remindBeforeDays = "NOT_ALLOWED";
  if (v.purchasedAt && v.purchasedAt > today) errors.purchasedAt = "IN_FUTURE";
  if (v.expiresAt && v.purchasedAt && v.expiresAt < v.purchasedAt) errors.expiresAt = "BEFORE_PURCHASE";
  if (v.openedAt && v.openedAt > today) errors.openedAt = "IN_FUTURE";
  else if (v.openedAt && v.purchasedAt && v.openedAt < v.purchasedAt) errors.openedAt = "BEFORE_PURCHASE";
  return errors;
}

function invalidCodes(input: ProductInput) {
  const errors: Record<string, string> = {};
  if (input.category !== undefined && !CATEGORIES.includes(input.category)) errors.category = "INVALID";
  if (input.zone !== undefined && !(input.zone in { fresh: 1, middle: 1, door: 1, freezer: 1 })) errors.zone = "INVALID";
  if (input.unit !== undefined && !(input.unit in { g: 1, kg: 1, ml: 1, l: 1, pcs: 1 })) errors.unit = "INVALID";
  return errors;
}

const SORTS = {
  expiry: (a: Product, b: Product) => a.effectiveExpiresAt.localeCompare(b.effectiveExpiresAt) || a.name.localeCompare(b.name, "uk"),
  name: (a: Product, b: Product) => a.name.localeCompare(b.name, "uk") || a.effectiveExpiresAt.localeCompare(b.effectiveExpiresAt),
  added: (a: Product, b: Product) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id, undefined, { numeric: true }),
  category: (a: Product, b: Product) => a.category.localeCompare(b.category) || SORTS.expiry(a, b),
};

export const mockFridge = {
  async list(query: ProductQuery = {}): Promise<ProductPage> {
    requireMockSession();
    await delay();
    const page = query.page ?? 1;
    const size = query.size ?? 20;
    const errors: Record<string, string> = {};
    if (page < 1) errors.page = "Min";
    if (size < 1 || size > 100) errors.size = "Range";
    if (Object.keys(errors).length) throw validation(errors);

    const q = query.q?.trim().toLowerCase();
    const base = products
      .filter((p) => p.householdId === householdId() && p.status === (query.status ?? "ACTIVE"))
      .map(view)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.brand ?? "").toLowerCase().includes(q))
      .filter((p) => !query.freshness?.length || query.freshness.includes(p.freshness));
    const categoryCounts = Object.fromEntries(CATEGORIES.map((c) => [c, base.filter((p) => p.category === c).length])) as Record<Category, number>;
    const filtered = base.filter((p) => !query.category?.length || query.category.includes(p.category)).sort(SORTS[query.sort ?? "expiry"]);
    return {
      items: filtered.slice((page - 1) * size, page * size),
      page,
      size,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / size),
      categoryCounts,
    };
  },

  async get(id: string): Promise<Product> {
    requireMockSession();
    await delay(60);
    return view(find(id));
  },

  async create(input: ProductInput): Promise<Product> {
    requireMockSession();
    await delay();
    const codes = invalidCodes(input);
    if (Object.keys(codes).length) throw validation(codes);
    const today = isoDate(clock());
    const category = input.category;
    const values: Partial<Stored> = {
      name: input.name,
      brand: input.brand ? collapse(input.brand) : null,
      category,
      zone: input.zone ?? (category ? DEFAULT_ZONE[category] : undefined),
      quantity: input.quantity,
      unit: input.unit,
      purchasedAt: input.purchasedAt ?? null,
      expiresAt: input.expiresAt,
      openedAt: input.openedAt ?? null,
      remindBeforeDays: (input.remindBeforeDays ?? 2) as Stored["remindBeforeDays"],
    };
    const errors = validate(values, today);
    if (Object.keys(errors).length) throw validation(errors);
    const at = clock().toISOString();
    const name = collapse(values.name!);
    const stored: Stored = {
      ...(values as Stored),
      id: `p${++seq}`,
      name,
      openedShelfLifeDays: values.openedAt ? openedShelfLifeDays(values.category!, name) : null,
      status: "ACTIVE",
      addedBy: author(),
      createdAt: at,
      updatedAt: at,
      householdId: householdId(),
    };
    products = [stored, ...products];
    log("ADDED", stored);
    return view(stored);
  },

  async update(id: string, input: ProductInput): Promise<Product> {
    requireMockSession();
    await delay();
    const current = find(id);
    if (current.status !== "ACTIVE") throw new ApiError(409, "Product is already written off", { code: "PRODUCT_CLOSED" });
    const codes = invalidCodes(input);
    if (Object.keys(codes).length) throw validation(codes);
    const has = (k: keyof ProductInput) => Object.prototype.hasOwnProperty.call(input, k);
    const merged: Partial<Stored> = { ...current };
    for (const key of ["name", "brand", "category", "zone", "quantity", "unit", "purchasedAt", "expiresAt", "openedAt", "remindBeforeDays"] as const) {
      if (has(key)) (merged as Record<string, unknown>)[key] = input[key] ?? null;
    }
    const errors = validate(merged, isoDate(clock()));
    if (Object.keys(errors).length) throw validation(errors);
    const name = collapse(merged.name!);
    const openedChanged = has("openedAt") && (input.openedAt ?? null) !== current.openedAt;
    Object.assign(current, merged, {
      name,
      brand: merged.brand ? collapse(merged.brand) : null,
      openedShelfLifeDays: !merged.openedAt ? null : openedChanged ? openedShelfLifeDays(merged.category!, name) : current.openedShelfLifeDays,
      updatedAt: clock().toISOString(),
    });
    log(openedChanged && merged.openedAt ? "OPENED" : "UPDATED", current);
    return view(current);
  },

  async writeOff(id: string, request: WriteOffRequest): Promise<WriteOffResult> {
    requireMockSession();
    await delay();
    const product = find(id);
    if (product.status !== "ACTIVE") throw new ApiError(409, "Product is already written off", { code: "PRODUCT_CLOSED" });
    const errors: Record<string, string> = {};
    if (!request?.outcome) errors.outcome = "NotNull";
    else if (!["EATEN", "COOKED", "WASTED"].includes(request.outcome)) errors.outcome = "INVALID";
    let amount: number | null = null;
    if (typeof request?.quantity === "number") {
      if (!(request.quantity > 0)) errors.quantity = "Positive";
      else if (!digitsOk(request.quantity)) errors.quantity = "Digits";
      else if (request.quantity > product.quantity) errors.quantity = "EXCEEDS_REMAINING";
      else if (request.quantity < product.quantity) amount = request.quantity;
    } else if (request?.quantity !== undefined && String(request.quantity).trim().toLowerCase() !== "all") errors.quantity = "INVALID";
    if (Object.keys(errors).length) throw validation(errors);

    const written = amount ?? product.quantity;
    const closed = amount === null;
    if (closed) product.status = request.outcome === "WASTED" ? "WASTED" : "CONSUMED";
    else product.quantity = Math.round((product.quantity - written) * 1000) / 1000;
    product.updatedAt = clock().toISOString();
    log("WRITTEN_OFF", product, { outcome: request.outcome, quantity: written, unit: product.unit });
    const result = view(product);
    const inShoppingList = writeOffHook(result, written, request);
    return { product: result, writtenOff: { outcome: request.outcome, quantity: written, unit: product.unit, closed }, addedToShoppingList: inShoppingList };
  },

  async summary(): Promise<ProductSummary> {
    requireMockSession();
    await delay(60);
    const active = products.filter((p) => p.householdId === householdId() && p.status === "ACTIVE").map(view);
    const weekAgo = new Date(clock().getTime() - 7 * DAY).toISOString();
    return {
      total: active.length,
      addedThisWeek: active.filter((p) => p.createdAt >= weekAgo).length,
      soon: active.filter((p) => p.daysLeft >= 0 && p.daysLeft <= 2).length,
      today: active.filter((p) => p.daysLeft === 0).length,
      expired: active.filter((p) => p.daysLeft < 0).length,
    };
  },

  async tip(): Promise<Tip> {
    requireMockSession();
    await delay(60);
    const active = products
      .filter((p) => p.householdId === householdId() && p.status === "ACTIVE")
      .map(view)
      .sort(SORTS.expiry);
    const toView = (p: Product) => ({ id: p.id, name: p.name, category: p.category, daysLeft: p.daysLeft });
    const date = isoDate(clock());
    const urgent = active.filter((p) => p.daysLeft >= 0 && p.daysLeft <= 1).slice(0, 4);
    if (urgent.length) {
      const counts = new Map<Category, number>();
      urgent.forEach((p) => counts.set(p.category, (counts.get(p.category) ?? 0) + 1));
      const max = Math.max(...counts.values());
      const dominant = urgent.find((p) => counts.get(p.category) === max)!.category;
      const hint = ({ vegetables: "SALAD", dairy: "PANCAKES", meat: "STIR_FRY", fruits: "SMOOTHIE", sauces: "PASTA", other: "OMELETTE" } as const)[dominant];
      return { date, kind: "USE_SOON", products: urgent.map(toView), hint };
    }
    const expired = active.filter((p) => p.daysLeft < 0).slice(0, 4);
    if (expired.length) return { date, kind: "EXPIRED", products: expired.map(toView), hint: null };
    return { date, kind: active.length ? "ALL_FRESH" : "EMPTY", products: [], hint: null };
  },

  async dictionaries(): Promise<Dictionaries> {
    requireMockSession();
    await delay(40);
    return MOCK_DICTIONARIES;
  },
};

/** Хелпери лише для тестів і інших моків (список покупок B-42 / Smart Sync B-43). */
export const mockFridgeControl = {
  /** Хук списання не скидається: його ставить мок списку покупок один раз при завантаженні. */
  reset() {
    clock = () => new Date();
    seed();
  },
  setClock(now: () => Date) {
    clock = now;
  },
  onWriteOff(hook: WriteOffHook) {
    writeOffHook = hook;
  },
  /** Синхронне створення продукту для інших моків («Перенести в холодильник»). */
  insert(input: ProductInput & { name: string; category: Category; quantity: number; unit: Unit; expiresAt: string }) {
    const at = clock().toISOString();
    const stored: Stored = {
      id: `p${++seq}`, name: collapse(input.name), brand: input.brand ?? null, category: input.category,
      zone: input.zone ?? DEFAULT_ZONE[input.category], quantity: input.quantity, unit: input.unit,
      purchasedAt: input.purchasedAt ?? null, expiresAt: input.expiresAt, openedAt: null, openedShelfLifeDays: null,
      remindBeforeDays: 2, status: "ACTIVE", addedBy: author(), createdAt: at, updatedAt: at, householdId: householdId(),
    };
    products = [stored, ...products];
    return view(stored);
  },
  all: () => products.filter((p) => p.householdId === householdId()).map(view),
  events: (household: string) => events.filter((e) => e.householdId === household),
  /** B-52: хто був сам, переносить продукти й історію в сім'ю. */
  reassign(from: string, to: string) {
    products.forEach((p) => p.householdId === from && (p.householdId = to));
    events.forEach((e) => e.householdId === from && (e.householdId = to));
  },
  /** B-55: каскадне видалення. */
  drop(household: string) {
    products = products.filter((p) => p.householdId !== household);
    events = events.filter((e) => e.householdId !== household);
  },
  today: () => isoDate(clock()),
  now: () => clock(),
  defaultShelfLifeDays: (category: Category) => SHELF_LIFE[category],
};
