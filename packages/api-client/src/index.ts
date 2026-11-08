import { configureHttp, http } from "./http";
import { mockApi } from "./mock";
import type { DiscardReason, Product, ProductCreate, Recipe, ShoppingItem, User } from "./types";

export * from "./types";
export { ApiError, http } from "./http";

let useMock = false;

export function configureApi(options: { baseUrl?: string; mock?: boolean; onUnauthorized?: () => void }) {
  useMock = options.mock ?? false;
  configureHttp(options);
}

const json = (body: unknown) => JSON.stringify(body);

/**
 * Ручний фасад над API. Сигнатури відповідають operationId в openapi.yaml,
 * тож після генерації orval можна безболісно перейти на `./generated`.
 */
export const api = {
  auth: {
    me: (): Promise<User> => (useMock ? mockApi.me() : http("/auth/me")),
  },
  products: {
    list: (): Promise<Product[]> => (useMock ? mockApi.listProducts() : http("/products")),
    create: (input: ProductCreate): Promise<Product> =>
      useMock ? mockApi.createProduct(input) : http("/products", { method: "POST", body: json(input) }),
    discard: (id: string, reason: DiscardReason = "eaten"): Promise<void> =>
      useMock ? mockApi.discardProduct(id) : http(`/products/${id}?reason=${reason}`, { method: "DELETE" }),
  },
  recipes: {
    suggest: (productIds: string[]): Promise<Recipe[]> =>
      useMock
        ? mockApi.suggestRecipes(productIds)
        : http("/recipes/suggest", { method: "POST", body: json({ productIds }) }),
  },
  shoppingList: {
    get: (): Promise<ShoppingItem[]> => (useMock ? mockApi.getShoppingList() : http("/shopping-list")),
    toggle: (id: string): Promise<void> =>
      useMock ? mockApi.toggleShoppingItem(id) : http(`/shopping-list/${id}/toggle`, { method: "POST" }),
    addMany: (names: string[]): Promise<void> =>
      useMock ? mockApi.addShoppingItems(names) : http("/shopping-list", { method: "POST", body: json({ names }) }),
  },
};

/** Ключі кешу TanStack Query — єдине джерело правди для інвалідації. */
export const queryKeys = {
  me: ["me"] as const,
  products: ["products"] as const,
  recipes: (ids: string[]) => ["recipes", [...ids].sort()] as const,
  shoppingList: ["shopping-list"] as const,
};
