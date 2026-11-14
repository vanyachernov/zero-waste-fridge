import { configureHttp, http, isApiError, notifyUnauthorized, type ApiError } from "./http";
import { mockFridge, mockFridgeControl } from "./mock-fridge";
import { mockRecipes } from "./mock-recipes";
import { mockStatsOverview } from "./mock-stats";
import { mockShopping } from "./mock-shopping";
import { mockHousehold } from "./mock-household";
import { mockNotifications } from "./mock-notifications";
import { mockAuth, setMockSessionRequired } from "./mock-auth";
import type {
  ActivityPage,
  NotificationFeed,
  NotificationSettings,
  Presence,
  PushSubscriptionInput,
  CurrentUser,
  ThemePreference,
  FamilyCode,
  Household,
  HouseholdRole,
  Invite,
  JoinRequest,
  Member,
  Dictionaries,
  LoginRequest,
  Product,
  ProductInput,
  ProductPage,
  ProductQuery,
  ProductSummary,
  CookRequest,
  CookResult,
  RecipeCard,
  RecipeDetail,
  RecipeSort,
  SavedStats,
  StatsOverview,
  RegisterRequest,
  ResetPasswordRequest,
  MoveToFridgeRequest,
  MoveToFridgeResult,
  ShoppingItem,
  ShoppingItemInput,
  ShoppingList,
  ShoppingSettings,
  ShoppingSummary,
  Store,
  Tip,
  WriteOffRequest,
  WriteOffResult,
} from "./types";

export * from "./types";
export { ApiError, CSRF_COOKIE, CSRF_HEADER, apiUrl, http, isApiError, readCookie } from "./http";
export { DEMO_ACCOUNT, mockAuthControl } from "./mock-auth";
export { MOCK_DICTIONARIES, mockFridgeControl, openedShelfLifeDays } from "./mock-fridge";
export { mockShoppingControl } from "./mock-shopping";
export { convertQuantity } from "./mock-recipes";
export { mockHouseholdControl, normalizeJoinCode } from "./mock-household";
export { mockNotificationsControl } from "./mock-notifications";

/**
 * Що обслуговують in-memory моки:
 * - `auth` — вхід, реєстрація, сесія, відновлення пароля (B-02…B-06);
 * - `fridge` — продукти, підсумки, порада дня, довідники (B-10…B-16);
 * - `shopping` — список покупок (B-40…B-45);
 * - `household` — сім'я, учасники, запрошення (B-50…B-55);
 * - `recipes` — рецепти й «Врятовано» (B-20…B-24).
 */
export type MockDomain = "auth" | "fridge" | "shopping" | "household" | "recipes";
export type MockMode = boolean | readonly MockDomain[];

const ALL_DOMAINS: readonly MockDomain[] = ["auth", "fridge", "shopping", "household", "recipes"];
/**
 * `data` — історична назва «дані на моках, вхід справжній» (I-01). Сім'я сюди не входить: її мок
 * спирається на мок-сесію (хто я, яка роль), а з справжнім входом мок-сесії немає.
 */
const DATA_DOMAINS: readonly MockDomain[] = ["fridge", "shopping", "recipes"];
let mocked = new Set<MockDomain>();

/**
 * Значення `VITE_API_MOCK` → режим моків:
 * `true` — усе на моках; `false` / порожньо — усе на бекенді;
 * перелік доменів через кому (`recipes`, `shopping,recipes`) — лише вони на моках;
 * `data` — продукти, список покупок і рецепти (вхід і сім'я — справжні).
 */
export function parseMockMode(value: string | undefined): MockMode {
  const raw = (value ?? "").trim().toLowerCase();
  if (raw === "" || raw === "false" || raw === "0" || raw === "off") return false;
  if (raw === "true" || raw === "1" || raw === "on" || raw === "all") return true;
  const domains = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part): string[] => (part === "data" ? [...DATA_DOMAINS] : [part]));
  const unknown = domains.filter((d) => !ALL_DOMAINS.includes(d as MockDomain));
  if (unknown.length > 0) {
    throw new Error(`VITE_API_MOCK: невідомі значення ${unknown.join(", ")}. Дозволено: true, false, data, ${ALL_DOMAINS.join(", ")}`);
  }
  return [...new Set(domains)] as MockDomain[];
}

export function configureApi(options: { baseUrl?: string; mock?: MockMode; onUnauthorized?: (error: ApiError) => void }) {
  const mock = options.mock ?? false;
  mocked = new Set(mock === true ? ALL_DOMAINS : mock === false ? [] : mock);
  setMockSessionRequired(mocked.has("auth"));
  configureHttp(options);
}

/** Без аргументу — чи на моках автентифікація (демо-акаунт, посилання зі «листа» на екрані). */
export function isMockApi(domain: MockDomain = "auth") {
  return mocked.has(domain);
}

let forcedRealtime = false;

/** F-63: потік `/api/household/stream` є лише на бекенді (у моках сім'ї його немає). */
export function realtimeAvailable() {
  return forcedRealtime || !isMockApi("household");
}

/** Лише для тестів: відкрити потік попри моки (з підміненим EventSource). */
export function forceRealtimeForTests(value: boolean) {
  forcedRealtime = value;
}

const json = (body: unknown) => JSON.stringify(body);

/** Мок-відповіді проходять той самий шлях обробки 401, що й справжні запити через http(). */
function viaMock<T>(call: () => Promise<T>, options: { skipUnauthorizedHandler?: boolean } = {}): Promise<T> {
  return call().catch((error: unknown) => {
    if (isApiError(error, 401) && !options.skipUnauthorizedHandler) notifyUnauthorized(error);
    throw error;
  });
}
/** Активні продукти для моку рецептів — з моку холодильника або з бекенду, що б не було на моках. */
async function fridgeForMock(): Promise<Product[]> {
  return (await api.products.list({ size: 100 })).items;
}

/** 401 від auth-ендпоінтів — очікуваний результат (неправильний пароль, немає сесії), а не «сесія закінчилась». */
const auth = { skipUnauthorizedHandler: true } as const;

/** `?q=…&category=dairy&category=meat` — масиви як повторювані параметри (так їх читає Spring). */
export function toQueryString(params: Record<string, string | number | readonly string[] | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) value.forEach((v) => search.append(key, String(v)));
    else search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

/**
 * Фасад над API. Сигнатури відповідають контролерам Spring (див. README → API),
 * тож після генерації orval з `/v3/api-docs` можна перейти на `./generated`.
 */
export const api = {
  auth: {
    /** B-05. Без сесії — ApiError 401. */
    me: (): Promise<CurrentUser> => (isMockApi("auth") ? mockAuth.me() : http("/auth/me", auth)),
    /** B-03. Неправильні дані — ApiError 401 `INVALID_CREDENTIALS`. */
    login: (body: LoginRequest): Promise<CurrentUser> =>
      isMockApi("auth") ? mockAuth.login(body) : http("/auth/login", { ...auth, method: "POST", body: json(body) }),
    /** B-02. Зайнятий email — 409 `EMAIL_TAKEN`; слабкий пароль — 400 `PASSWORD_POLICY`. */
    register: (body: RegisterRequest): Promise<CurrentUser> =>
      isMockApi("auth") ? mockAuth.register(body) : http("/auth/register", { ...auth, method: "POST", body: json(body) }),
    logout: (): Promise<void> => (isMockApi("auth") ? mockAuth.logout() : http("/auth/logout", { ...auth, method: "POST" })),
    /** F-90: тема в профілі (204). */
    setTheme: (theme: ThemePreference): Promise<void> =>
      isMockApi("auth") ? mockAuth.setTheme(theme) : http("/me/theme", { method: "PUT", body: json({ theme }) }),
    /** B-06. Завжди успіх (202), навіть для невідомого email. */
    forgotPassword: (email: string): Promise<void> =>
      isMockApi("auth") ? mockAuth.forgotPassword(email) : http("/auth/password/forgot", { ...auth, method: "POST", body: json({ email }) }),
    /** B-06. Невалідний/прострочений токен — 400 `INVALID_RESET_TOKEN`. */
    resetPassword: (body: ResetPasswordRequest): Promise<void> =>
      isMockApi("auth") ? mockAuth.resetPassword(body) : http("/auth/password/reset", { ...auth, method: "POST", body: json(body) }),
  },
  products: {
    /** B-11. Сторінка з 1; `categoryCounts` — для чіпів. */
    list: (query: ProductQuery = {}): Promise<ProductPage> =>
      isMockApi("fridge")
        ? viaMock(() => mockFridge.list(query))
        : http(
            `/products${toQueryString({ q: query.q, category: query.category, freshness: query.freshness, status: query.status, sort: query.sort, page: query.page, size: query.size })}`,
          ),
    get: (id: string): Promise<Product> => (isMockApi("fridge") ? viaMock(() => mockFridge.get(id)) : http(`/products/${id}`)),
    create: (input: ProductInput): Promise<Product> =>
      isMockApi("fridge") ? viaMock(() => mockFridge.create(input)) : http("/products", { method: "POST", body: json(input) }),
    /** Відсутнє поле — без змін, `null` — очистити. Списаний продукт — 409 `PRODUCT_CLOSED`. */
    update: (id: string, input: ProductInput): Promise<Product> =>
      isMockApi("fridge") ? viaMock(() => mockFridge.update(id, input)) : http(`/products/${id}`, { method: "PATCH", body: json(input) }),
    /** B-13. Частково або все; `addedToShoppingList` — продукт тепер у списку покупок. */
    writeOff: (id: string, request: WriteOffRequest): Promise<WriteOffResult> =>
      isMockApi("fridge")
        ? viaMock(() => mockFridge.writeOff(id, request))
        : http(`/products/${id}/write-off`, { method: "POST", body: json(request) }),
    /** B-14. */
    summary: (): Promise<ProductSummary> => (isMockApi("fridge") ? viaMock(() => mockFridge.summary()) : http("/products/summary")),
  },
  /** B-15. */
  tips: {
    today: (): Promise<Tip> => (isMockApi("fridge") ? viaMock(() => mockFridge.tip()) : http("/tips/today")),
  },
  /** B-16. */
  dictionaries: {
    get: (): Promise<Dictionaries> => (isMockApi("fridge") ? viaMock(() => mockFridge.dictionaries()) : http("/dictionaries")),
  },
  /** B-21…B-23. На моках — той самий каталог і правила підбору, продукти беруться з поточного холодильника. */
  recipes: {
    recommended: async (sort: RecipeSort = "critical", limit = 6): Promise<RecipeCard[]> =>
      isMockApi("recipes")
        ? viaMock(async () => mockRecipes.recommended(await fridgeForMock(), sort, limit))
        : http(`/recipes/recommended${toQueryString({ sort, limit })}`),
    /** 3–4 продукти; AI на бекенді (DeepSeek), без ключа — найкращий рецепт каталогу. Нічого не підійшло — 422 `NO_RECIPE`. */
    generate: async (productIds: string[]): Promise<RecipeDetail> =>
      isMockApi("recipes")
        ? viaMock(async () => mockRecipes.generate(await fridgeForMock(), productIds))
        : http("/recipes/generate", { method: "POST", body: json({ productIds }) }),
    get: async (id: string): Promise<RecipeDetail> =>
      isMockApi("recipes") ? viaMock(async () => mockRecipes.get(await fridgeForMock(), id)) : http(`/recipes/${id}`),
    /** «Приготувати і списати» (outcome COOKED). */
    cook: async (id: string, request: CookRequest = {}): Promise<CookResult> =>
      isMockApi("recipes")
        ? viaMock(async () => mockRecipes.cook(await fridgeForMock(), id, request, (productId, body) => api.products.writeOff(productId, body)))
        : http(`/recipes/${id}/cook`, { method: "POST", body: json(request) }),
  },
  /** B-24, B-200. */
  stats: {
    overview: async (months = 6): Promise<StatsOverview> =>
      isMockApi("recipes")
        ? viaMock(async () => mockStatsOverview((await api.auth.me()).householdId, months))
        : http(`/stats/overview${toQueryString({ months })}`),
    saved: async (): Promise<SavedStats> => {
      if (!isMockApi("recipes")) return http("/stats/saved?period=month");
      return viaMock(async () => {
        const me = await api.auth.me();
        const now = new Date();
        const from = new Date(now.getFullYear(), now.getMonth(), 1);
        const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const events = isMockApi("fridge") ? mockFridgeControl.events(me.householdId) : [];
        const inMonth = events.filter((e) => e.type === "WRITTEN_OFF" && new Date(e.at) >= from);
        const distinct = (outcomes: string[]) => new Set(inMonth.filter((e) => outcomes.includes(e.outcome ?? "")).map((e) => e.productId)).size;
        return { period: "month", from: iso(from), to: iso(to), saved: distinct(["EATEN", "COOKED"]), wasted: distinct(["WASTED"]) };
      });
    },
  },
  /** B-40…B-45. */
  shoppingList: {
    get: (filter: { store?: string; fromFridge?: boolean } = {}): Promise<ShoppingList> =>
      isMockApi("shopping")
        ? viaMock(() => mockShopping.list(filter))
        : http(`/shopping-list${toQueryString({ store: filter.store, fromFridge: filter.fromFridge ? "true" : undefined })}`),
    add: (input: ShoppingItemInput): Promise<ShoppingItem> =>
      isMockApi("shopping") ? viaMock(() => mockShopping.add(input)) : http("/shopping-list", { method: "POST", body: json(input) }),
    update: (id: string, input: ShoppingItemInput): Promise<ShoppingItem> =>
      isMockApi("shopping") ? viaMock(() => mockShopping.update(id, input)) : http(`/shopping-list/${id}`, { method: "PATCH", body: json(input) }),
    remove: (id: string): Promise<void> =>
      isMockApi("shopping") ? viaMock(() => mockShopping.remove(id)) : http(`/shopping-list/${id}`, { method: "DELETE" }),
    toggle: (id: string): Promise<ShoppingItem> =>
      isMockApi("shopping") ? viaMock(() => mockShopping.toggle(id)) : http(`/shopping-list/${id}/toggle`, { method: "POST" }),
    /** B-41. */
    clearBought: (): Promise<{ deleted: number }> =>
      isMockApi("shopping") ? viaMock(() => mockShopping.clearBought()) : http("/shopping-list/bought", { method: "DELETE" }),
    /** B-42. Усе або нічого; некуплене — 409 `ITEM_NOT_BOUGHT`. */
    moveToFridge: (request: MoveToFridgeRequest = {}): Promise<MoveToFridgeResult> =>
      isMockApi("shopping")
        ? viaMock(() => mockShopping.moveToFridge(request))
        : http("/shopping-list/move-to-fridge", { method: "POST", body: json(request) }),
    /** B-45. */
    summary: (): Promise<ShoppingSummary> => (isMockApi("shopping") ? viaMock(() => mockShopping.summary()) : http("/shopping-list/summary")),
    /** B-43. */
    settings: (): Promise<ShoppingSettings> => (isMockApi("shopping") ? viaMock(() => mockShopping.getSettings()) : http("/shopping-list/settings")),
    saveSettings: (next: ShoppingSettings): Promise<ShoppingSettings> =>
      isMockApi("shopping") ? viaMock(() => mockShopping.putSettings(next)) : http("/shopping-list/settings", { method: "PUT", body: json(next) }),
    /** B-44. */
    stores: (): Promise<Store[]> => (isMockApi("shopping") ? viaMock(() => mockShopping.stores()) : http("/shopping-list/stores")),
    addStore: (name: string): Promise<Store> =>
      isMockApi("shopping") ? viaMock(() => mockShopping.addStore(name)) : http("/shopping-list/stores", { method: "POST", body: json({ name }) }),
    removeStore: (id: string): Promise<void> =>
      isMockApi("shopping") ? viaMock(() => mockShopping.removeStore(id)) : http(`/shopping-list/stores/${id}`, { method: "DELETE" }),
  },
  /** B-50…B-55. */
  household: {
    get: (): Promise<Household> => (isMockApi("household") ? viaMock(() => mockHousehold.get()) : http("/household")),
    rename: (name: string): Promise<Household> =>
      isMockApi("household") ? viaMock(() => mockHousehold.rename(name)) : http("/household", { method: "PATCH", body: json({ name }) }),
    /** Лише власник; неправильний пароль — помилка поля `password: INVALID_PASSWORD`. */
    remove: (password: string): Promise<CurrentUser> =>
      isMockApi("household") ? viaMock(() => mockHousehold.remove(password)) : http("/household", { method: "DELETE", body: json({ password }) }),
    members: (): Promise<Member[]> => (isMockApi("household") ? viaMock(() => mockHousehold.members()) : http("/household/members")),
    changeRole: (userId: string, role: HouseholdRole): Promise<Member> =>
      isMockApi("household")
        ? viaMock(() => mockHousehold.changeRole(userId, role))
        : http(`/household/members/${userId}`, { method: "PATCH", body: json({ role }) }),
    /** Власник видаляє учасника; свій id — вийти із сім'ї. */
    removeMember: (userId: string): Promise<void> =>
      isMockApi("household") ? viaMock(() => mockHousehold.removeMember(userId)) : http(`/household/members/${userId}`, { method: "DELETE" }),
    activity: (query: { before?: string; limit?: number } = {}): Promise<ActivityPage> =>
      isMockApi("household")
        ? viaMock(() => mockHousehold.activity(query.before, query.limit))
        : http(`/household/activity${toQueryString({ before: query.before, limit: query.limit })}`),
    invite: (email: string, role: HouseholdRole = "MEMBER"): Promise<Invite> =>
      isMockApi("household")
        ? viaMock(() => mockHousehold.invite(email, role))
        : http("/household/invites", { method: "POST", body: json({ email, role }) }),
    invites: (): Promise<Invite[]> => (isMockApi("household") ? viaMock(() => mockHousehold.invites()) : http("/household/invites")),
    cancelInvite: (id: string): Promise<void> =>
      isMockApi("household") ? viaMock(() => mockHousehold.cancelInvite(id)) : http(`/household/invites/${id}`, { method: "DELETE" }),
    code: (): Promise<FamilyCode> => (isMockApi("household") ? viaMock(() => mockHousehold.code()) : http("/household/invites/code")),
    regenerateCode: (): Promise<FamilyCode> =>
      isMockApi("household") ? viaMock(() => mockHousehold.regenerateCode()) : http("/household/invites/code", { method: "POST" }),
    /** Вступ: 400 `INVALID_INVITE`, 403 `INVITE_EMAIL_MISMATCH`, 409 `ALREADY_MEMBER` / `LAST_OWNER`. */
    join: (request: JoinRequest): Promise<CurrentUser> =>
      isMockApi("household") ? viaMock(() => mockHousehold.join(request)) : http("/household/join", { method: "POST", body: json(request) }),
  },
  /** B-32…B-34: дзвіночок, налаштування, Web Push. Моки — разом з доменом `household`. */
  notifications: {
    list: (limit = 20): Promise<NotificationFeed> =>
      isMockApi("household") ? viaMock(() => mockNotifications.list(limit)) : http(`/notifications${toQueryString({ limit })}`),
    unreadCount: (): Promise<{ count: number }> =>
      isMockApi("household") ? viaMock(() => mockNotifications.unreadCount()) : http("/notifications/unread-count"),
    read: (id: string): Promise<void> =>
      isMockApi("household") ? viaMock(() => mockNotifications.read(id)) : http(`/notifications/${id}/read`, { method: "POST" }),
    readAll: (): Promise<{ updated: number }> =>
      isMockApi("household") ? viaMock(() => mockNotifications.readAll()) : http("/notifications/read-all", { method: "POST" }),
    settings: (): Promise<NotificationSettings> =>
      isMockApi("household") ? viaMock(() => mockNotifications.settings()) : http("/me/notification-settings"),
    saveSettings: (next: NotificationSettings): Promise<NotificationSettings> =>
      isMockApi("household")
        ? viaMock(() => mockNotifications.saveSettings(next))
        : http("/me/notification-settings", { method: "PUT", body: json(next) }),
    /** `publicKey: null` — push на сервері вимкнено. */
    pushPublicKey: (): Promise<{ publicKey: string | null }> =>
      isMockApi("household") ? viaMock(() => mockNotifications.pushPublicKey()) : http("/me/push/public-key"),
    subscribePush: (subscription: PushSubscriptionInput): Promise<void> =>
      isMockApi("household")
        ? viaMock(() => mockNotifications.subscribePush(subscription))
        : http("/me/push-subscriptions", { method: "POST", body: json(subscription) }),
    unsubscribePush: (endpoint: string): Promise<void> =>
      isMockApi("household")
        ? viaMock(() => mockNotifications.unsubscribePush(endpoint))
        : http("/me/push-subscriptions", { method: "DELETE", body: json({ endpoint }) }),
  },
  /** B-54. Потік подій — `streamUrl()` для EventSource (у моках його немає). */
  realtime: {
    presence: (): Promise<Presence> => (isMockApi("household") ? viaMock(() => mockNotifications.presence()) : http("/household/presence")),
    setShopping: (store: string | null): Promise<void> =>
      isMockApi("household")
        ? viaMock(() => mockNotifications.setShopping(store))
        : http("/household/presence", { method: "POST", body: json({ shoppingAt: store }) }),
  },
};

/** Ключі кешу TanStack Query — єдине джерело правди для інвалідації. */
export const queryKeys = {
  me: ["me"] as const,
  /** Префікс усього, що залежить від продуктів: списки, підсумки, порада. */
  products: ["products"] as const,
  productList: (query: ProductQuery) => ["products", "list", query] as const,
  product: (id: string) => ["products", "item", id] as const,
  productSummary: ["products", "summary"] as const,
  tip: ["products", "tip"] as const,
  dictionaries: ["dictionaries"] as const,
  household: ["household"] as const,
  members: ["household", "members"] as const,
  invites: ["household", "invites"] as const,
  familyCode: ["household", "code"] as const,
  activity: ["household", "activity"] as const,
  presence: ["household", "presence"] as const,
  notifications: ["notifications"] as const,
  unreadCount: ["notifications", "unread"] as const,
  notificationSettings: ["notifications", "settings"] as const,
  recipes: ["recipes"] as const,
  recommendedRecipes: (sort: string) => ["recipes", "recommended", sort] as const,
  recipe: (id: string) => ["recipes", id] as const,
  savedStats: ["stats", "saved"] as const,
  statsOverview: (months: number) => ["stats", "overview", months] as const,
  shoppingList: ["shopping-list"] as const,
  shoppingSummary: ["shopping-list", "summary"] as const,
  shoppingSettings: ["shopping-list", "settings"] as const,
  stores: ["shopping-list", "stores"] as const,
};
