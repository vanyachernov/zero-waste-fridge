import { queryOptions } from "@tanstack/react-query";
import { api, queryKeys } from "@zwf/api-client";

/** Поточний користувач (B-05). Без сесії — ApiError 401; не повторюємо. */
export const meQuery = queryOptions({ queryKey: queryKeys.me, queryFn: api.auth.me, staleTime: Infinity, retry: false });

export const productsQuery = queryOptions({ queryKey: queryKeys.products, queryFn: api.products.list });

export const recipesQuery = (ids: string[]) =>
  queryOptions({
    queryKey: queryKeys.recipes(ids),
    queryFn: () => api.recipes.suggest(ids),
    enabled: ids.length > 0,
    staleTime: 5 * 60_000,
  });

export const shoppingQuery = queryOptions({ queryKey: queryKeys.shoppingList, queryFn: api.shoppingList.get });
