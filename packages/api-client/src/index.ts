import { configureHttp, http, isApiError, notifyUnauthorized, type ApiError } from "./http";
import { mockApi } from "./mock";
import { mockAuth } from "./mock-auth";
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

let useMock = false;

export function configureApi(options: { baseUrl?: string; mock?: boolean; onUnauthorized?: (error: ApiError) => void }) {
  useMock = options.mock ?? false;
  configureHttp(options);
}

export function isMockApi() {
  return useMock;
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
    me: (): Promise<CurrentUser> => (useMock ? mockAuth.me() : http("/auth/me", auth)),
    /** B-03. Неправильні дані — ApiError 401 `INVALID_CREDENTIALS`. */
    login: (body: LoginRequest): Promise<CurrentUser> =>
      useMock ? mockAuth.login(body) : http("/auth/login", { ...auth, method: "POST", body: json(body) }),
    /** B-02. Зайнятий email — 409 `EMAIL_TAKEN`; слабкий пароль — 400 `PASSWORD_POLICY`. */
    register: (body: RegisterRequest): Promise<CurrentUser> =>
      useMock ? mockAuth.register(body) : http("/auth/register", { ...auth, method: "POST", body: json(body) }),
    logout: (): Promise<void> => (useMock ? mockAuth.logout() : http("/auth/logout", { ...auth, method: "POST" })),
    /** B-06. Завжди успіх (202), навіть для невідомого email. */
    forgotPassword: (email: string): Promise<void> =>
      useMock ? mockAuth.forgotPassword(email) : http("/auth/password/forgot", { ...auth, method: "POST", body: json({ email }) }),
    /** B-06. Невалідний/прострочений токен — 400 `INVALID_RESET_TOKEN`. */
    resetPassword: (body: ResetPasswordRequest): Promise<void> =>
      useMock ? mockAuth.resetPassword(body) : http("/auth/password/reset", { ...auth, method: "POST", body: json(body) }),
  },
  products: {
    list: (): Promise<Product[]> => (useMock ? viaMock(() => mockApi.listProducts()) : http("/products")),
    create: (input: ProductCreate): Promise<Product> =>
      useMock ? viaMock(() => mockApi.createProduct(input)) : http("/products", { method: "POST", body: json(input) }),
    discard: (id: string, reason: DiscardReason = "eaten"): Promise<void> =>
      useMock ? viaMock(() => mockApi.discardProduct(id)) : http(`/products/${id}?reason=${reason}`, { method: "DELETE" }),
  },
  recipes: {
    suggest: (productIds: string[]): Promise<Recipe[]> =>
      useMock ? viaMock(() => mockApi.suggestRecipes(productIds)) : http("/recipes/suggest", { method: "POST", body: json({ productIds }) }),
  },
  shoppingList: {
    get: (): Promise<ShoppingItem[]> => (useMock ? viaMock(() => mockApi.getShoppingList()) : http("/shopping-list")),
    toggle: (id: string): Promise<void> =>
      useMock ? viaMock(() => mockApi.toggleShoppingItem(id)) : http(`/shopping-list/${id}/toggle`, { method: "POST" }),
    addMany: (names: string[]): Promise<void> =>
      useMock ? viaMock(() => mockApi.addShoppingItems(names)) : http("/shopping-list", { method: "POST", body: json({ names }) }),
  },
};

/** Ключі кешу TanStack Query — єдине джерело правди для інвалідації. */
export const queryKeys = {
  me: ["me"] as const,
  products: ["products"] as const,
  recipes: (ids: string[]) => ["recipes", [...ids].sort()] as const,
  shoppingList: ["shopping-list"] as const,
};
