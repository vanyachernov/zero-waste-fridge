import { configureHttp, http, isApiError, notifyUnauthorized, type ApiError } from "./http";
import { mockApi } from "./mock";
import { mockAuth, setMockSessionRequired } from "./mock-auth";
import type {
  CurrentUser,
  DiscardReason,
  LoginRequest,
  Product,
  ProductCreate,
  Recipe,
  RegisterRequest,
  ResetPasswordRequest,
  ShoppingItem,
} from "./types";

export * from "./types";
export { ApiError, CSRF_COOKIE, CSRF_HEADER, http, isApiError, readCookie } from "./http";
export { DEMO_ACCOUNT, mockAuthControl } from "./mock-auth";

/**
 * Що обслуговують in-memory моки:
 * - `auth` — вхід, реєстрація, сесія, відновлення пароля (B-02…B-06);
 * - `data` — продукти, рецепти, список покупок (B-11+, B-20+, B-40+).
 */
export type MockDomain = "auth" | "data";
export type MockMode = boolean | readonly MockDomain[];

const ALL_DOMAINS: readonly MockDomain[] = ["auth", "data"];
let mocked = new Set<MockDomain>();

/**
 * Значення `VITE_API_MOCK` → режим моків:
 * `true` — усе на моках; `false` / порожньо — усе на бекенді;
 * `data` — справжня автентифікація, а продукти, рецепти й покупки поки на моках
 * (поки немає B-11 / B-40). Можна перелічити через кому: `auth,data`.
 */
export function parseMockMode(value: string | undefined): MockMode {
  const raw = (value ?? "").trim().toLowerCase();
  if (raw === "" || raw === "false" || raw === "0" || raw === "off") return false;
  if (raw === "true" || raw === "1" || raw === "on" || raw === "all") return true;
  const domains = raw.split(",").map((part) => part.trim()).filter(Boolean);
  const unknown = domains.filter((d) => !ALL_DOMAINS.includes(d as MockDomain));
  if (unknown.length > 0) {
    throw new Error(`VITE_API_MOCK: невідомі значення ${unknown.join(", ")}. Дозволено: true, false, ${ALL_DOMAINS.join(", ")}`);
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

const json = (body: unknown) => JSON.stringify(body);

/** Мок-відповіді проходять той самий шлях обробки 401, що й справжні запити через http(). */
function viaMock<T>(call: () => Promise<T>, options: { skipUnauthorizedHandler?: boolean } = {}): Promise<T> {
  return call().catch((error: unknown) => {
    if (isApiError(error, 401) && !options.skipUnauthorizedHandler) notifyUnauthorized(error);
    throw error;
  });
}
/** 401 від auth-ендпоінтів — очікуваний результат (неправильний пароль, немає сесії), а не «сесія закінчилась». */
const auth = { skipUnauthorizedHandler: true } as const;

/**
 * Фасад над API. Сигнатури відповідають operationId в openapi.yaml / контролерам Spring,
 * тож після генерації orval можна безболісно перейти на `./generated`.
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
    /** B-06. Завжди успіх (202), навіть для невідомого email. */
    forgotPassword: (email: string): Promise<void> =>
      isMockApi("auth") ? mockAuth.forgotPassword(email) : http("/auth/password/forgot", { ...auth, method: "POST", body: json({ email }) }),
    /** B-06. Невалідний/прострочений токен — 400 `INVALID_RESET_TOKEN`. */
    resetPassword: (body: ResetPasswordRequest): Promise<void> =>
      isMockApi("auth") ? mockAuth.resetPassword(body) : http("/auth/password/reset", { ...auth, method: "POST", body: json(body) }),
  },
  products: {
    list: (): Promise<Product[]> => (isMockApi("data") ? viaMock(() => mockApi.listProducts()) : http("/products")),
    create: (input: ProductCreate): Promise<Product> =>
      isMockApi("data") ? viaMock(() => mockApi.createProduct(input)) : http("/products", { method: "POST", body: json(input) }),
    discard: (id: string, reason: DiscardReason = "eaten"): Promise<void> =>
      isMockApi("data") ? viaMock(() => mockApi.discardProduct(id)) : http(`/products/${id}?reason=${reason}`, { method: "DELETE" }),
  },
  recipes: {
    suggest: (productIds: string[]): Promise<Recipe[]> =>
      isMockApi("data") ? viaMock(() => mockApi.suggestRecipes(productIds)) : http("/recipes/suggest", { method: "POST", body: json({ productIds }) }),
  },
  shoppingList: {
    get: (): Promise<ShoppingItem[]> => (isMockApi("data") ? viaMock(() => mockApi.getShoppingList()) : http("/shopping-list")),
    toggle: (id: string): Promise<void> =>
      isMockApi("data") ? viaMock(() => mockApi.toggleShoppingItem(id)) : http(`/shopping-list/${id}/toggle`, { method: "POST" }),
    addMany: (names: string[]): Promise<void> =>
      isMockApi("data") ? viaMock(() => mockApi.addShoppingItems(names)) : http("/shopping-list", { method: "POST", body: json({ names }) }),
  },
};

/** Ключі кешу TanStack Query — єдине джерело правди для інвалідації. */
export const queryKeys = {
  me: ["me"] as const,
  products: ["products"] as const,
  recipes: (ids: string[]) => ["recipes", [...ids].sort()] as const,
  shoppingList: ["shopping-list"] as const,
};
