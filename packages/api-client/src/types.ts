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

export type ShoppingPriority = "NORMAL" | "HIGH";
/** Звідки позиція: вручну, Smart Sync, рецепт, «Додати до списку» при списанні. */
export type ShoppingSource = "MANUAL" | "AUTO" | "RECIPE" | "WRITE_OFF";

export interface Store {
  id: string;
  name: string;
}

/** Позиція спільного списку покупок (B-40). */
export interface ShoppingItem {
  id: string;
  name: string;
  /** Кількість і одиниця — разом або жодної («Хліб»). */
  quantity: number | null;
  unit: Unit | null;
  category: Category | null;
  priority: ShoppingPriority;
  /** Орієнтовна ціна, ₴. */
  priceEstimate: number | null;
  store: Store | null;
  source: ShoppingSource;
  /** Продукт холодильника, після якого з'явилась позиція («Закінчився вчора в холодильнику»). */
  sourceProduct: { id: string; name: string; closedAt: string | null } | null;
  addedBy: Person | null;
  bought: boolean;
  boughtAt: string | null;
  boughtBy: Person | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingList {
  toBuy: ShoppingItem[];
  bought: ShoppingItem[];
}

/** Тіло POST / PATCH позиції. Для PATCH відсутнє поле — без змін, `null` — очистити. */
export interface ShoppingItemInput {
  name?: string;
  quantity?: number | null;
  unit?: Unit | null;
  category?: Category | null;
  priority?: ShoppingPriority;
  priceEstimate?: number | null;
  storeId?: string | null;
}

/** B-42: без `items` — усі куплені з типовими значеннями. */
export interface MoveToFridgeRequest {
  items?: { id: string; expiresAt?: string; zone?: StorageZone; category?: Category }[];
}

export interface MoveToFridgeResult {
  moved: number;
  products: Product[];
}

/** B-43: Smart Sync. */
export interface ShoppingSettings {
  autoRefill: boolean;
  excludedCategories: Category[];
}

/** B-45: «Куплено 4 з 6 · орієнтовно 480 ₴», «Авто-ввіз N». */
export interface ShoppingSummary {
  bought: number;
  total: number;
  estimatedTotal: number;
  autoCount: number;
}

// ---------- Сім'я (B-50…B-55) ----------

/** Дії з матриці «Ролі та права доступу». */
export type HouseholdPermission =
  | "VIEW_FRIDGE"
  | "EDIT_PRODUCTS"
  | "GENERATE_RECIPES"
  | "SHOPPING_LIST"
  | "RECEIVE_REMINDERS"
  | "MANAGE_MEMBERS"
  | "CHANGE_ROLES"
  | "DELETE_HOUSEHOLD"
  | "RENAME_HOUSEHOLD";

export interface Household {
  id: string;
  name: string;
  createdAt: string;
  memberCount: number;
  role: HouseholdRole;
  /** Фронтенд ховає недоступні дії за правами, а не за назвою ролі (F-62). */
  permissions: HouseholdPermission[];
}

export type ActivityType = "PRODUCT_ADDED" | "PRODUCT_UPDATED" | "PRODUCT_OPENED" | "PRODUCT_WRITTEN_OFF" | "SHOPPING_ADDED" | "SHOPPING_BOUGHT";

/** Запис стрічки «Остання дія» (B-53). */
export interface ActivityEntry {
  type: ActivityType;
  at: string;
  actor: Person | null;
  subject: { kind: "PRODUCT" | "SHOPPING_ITEM"; id: string | null; name: string };
  outcome: WriteOffOutcome | null;
  quantity: number | null;
  unit: Unit | null;
}

export interface ActivityPage {
  items: ActivityEntry[];
  /** Передати як `before`, щоб отримати старіші; `null` — кінець. */
  nextBefore: string | null;
}

export interface Member {
  /** id користувача. */
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: HouseholdRole;
  joinedAt: string;
  me: boolean;
  lastActivity: ActivityEntry | null;
}

export interface Invite {
  id: string;
  email: string;
  role: HouseholdRole;
  invitedBy: string | null;
  createdAt: string;
  expiresAt: string;
  /** Лист не дійшов — запрошення все одно створено. */
  emailSent: boolean;
}

/** Код сім'ї `ZWF-XXXX-XX`; `code = null` — коду немає або він прострочений. */
export interface FamilyCode {
  code: string | null;
  expiresAt: string | null;
}

/** Вступ: або код сім'ї, або токен із посилання в листі. */
export type JoinRequest = { code: string; invite?: never } | { invite: string; code?: never };

export type DiscardReason = "eaten" | "spoiled" | "donated";
