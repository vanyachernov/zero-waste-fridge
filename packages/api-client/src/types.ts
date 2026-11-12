/**
 * Тимчасові ручні типи, що дзеркалять openapi/openapi.yaml.
 * Після `pnpm api:generate` їх можна замінити на `./generated/model`.
 */
export type Category = "vegetables" | "dairy" | "meat" | "fruits" | "sauces" | "other";
export type StorageZone = "fresh" | "middle" | "door" | "freezer";
export type Unit = "g" | "kg" | "ml" | "l" | "pcs";

export type HouseholdRole = "OWNER" | "MEMBER";

/** Профіль поточного користувача — відповідь `register`, `login`, `GET /auth/me` (B-02, B-03, B-05). */
export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  householdId: string;
  householdName: string;
  role: HouseholdRole;
}

/** @deprecated використовуйте {@link CurrentUser} */
export type User = CurrentUser;

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

/** Стан терміну від `effectiveExpiresAt` (B-11): прострочено / сьогодні / ≤ 2 днів / свіже. */
export type Freshness = "expired" | "today" | "soon" | "fresh";
export type ProductStatus = "ACTIVE" | "CONSUMED" | "WASTED";
export type ProductSort = "expiry" | "name" | "added" | "category";
export type WriteOffOutcome = "EATEN" | "COOKED" | "WASTED";
export type ReminderDays = 1 | 2 | 3 | 7;

export interface Person {
  id: string;
  name: string;
}

/** Продукт у відповідях `/api/products` (B-10…B-12). Дати — `YYYY-MM-DD`. */
export interface Product {
  id: string;
  name: string;
  brand: string | null;
  category: Category;
  zone: StorageZone;
  quantity: number;
  unit: Unit;
  purchasedAt: string | null;
  expiresAt: string;
  openedAt: string | null;
  openedShelfLifeDays: number | null;
  /** Термін з урахуванням відкритої упаковки — за ним рахуються `daysLeft` і `freshness`. */
  effectiveExpiresAt: string;
  daysLeft: number;
  freshness: Freshness;
  remindBeforeDays: ReminderDays;
  status: ProductStatus;
  addedBy: Person | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Тіло `POST` / `PATCH /api/products`. Для PATCH відсутнє поле — без змін, `null` — очистити
 * (`brand`, `purchasedAt`, `openedAt`).
 */
export interface ProductInput {
  name?: string;
  brand?: string | null;
  category?: Category;
  zone?: StorageZone;
  quantity?: number;
  unit?: Unit;
  purchasedAt?: string | null;
  expiresAt?: string;
  openedAt?: string | null;
  remindBeforeDays?: number;
}

/** @deprecated використовуйте {@link ProductInput} */
export type ProductCreate = ProductInput;

export interface ProductQuery {
  q?: string;
  category?: Category[];
  freshness?: Freshness[];
  status?: ProductStatus;
  sort?: ProductSort;
  /** З 1. */
  page?: number;
  size?: number;
}

export interface ProductPage {
  items: Product[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
  /** Лічильники чіпів: з урахуванням пошуку й терміну, але без вибраної категорії. */
  categoryCounts: Record<Category, number>;
}

/** B-14: три StatCard. */
export interface ProductSummary {
  total: number;
  addedThisWeek: number;
  soon: number;
  today: number;
  expired: number;
}

export interface WriteOffRequest {
  outcome: WriteOffOutcome;
  /** `"all"` або частина в одиницях продукту. */
  quantity?: "all" | number;
  addToShoppingList?: boolean;
}

export interface WriteOffResult {
  product: Product;
  writtenOff: { outcome: WriteOffOutcome; quantity: number; unit: Unit; closed: boolean };
  addedToShoppingList: boolean;
}

export type TipKind = "USE_SOON" | "EXPIRED" | "ALL_FRESH" | "EMPTY";
export type RecipeHint = "SALAD" | "PANCAKES" | "STIR_FRY" | "SMOOTHIE" | "PASTA" | "OMELETTE";

/** B-15: «Розумна порада дня». */
export interface Tip {
  date: string;
  kind: TipKind;
  products: { id: string; name: string; category: Category; daysLeft: number }[];
  hint: RecipeHint | null;
}

/** B-16: довідники — лише коди й числа, назви в i18n. */
export interface Dictionaries {
  categories: { code: Category; defaultZone: StorageZone; defaultShelfLifeDays: number; openedShelfLifeDays: number }[];
  zones: { code: StorageZone; minTemperatureC: number; maxTemperatureC: number }[];
  units: { code: Unit; kind: "mass" | "volume" | "count" }[];
  remindBeforeDays: number[];
  defaultRemindBeforeDays: number;
  openedShelfLifeRules: { category: Category; keywords: string[]; days: number }[];
}

export interface Recipe {
  id: string;
  title: string;
  imageUrl?: string;
  minutes: number;
  kcal: number;
  difficulty: "easy" | "medium" | "hard";
  matchPercent: number;
  usedProductIds: string[];
  ingredients: string[];
  missing: string[];
  steps: string[];
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity?: string;
  reason?: "recipe" | "low-stock" | "manual";
  done: boolean;
}

export type DiscardReason = "eaten" | "spoiled" | "donated";
