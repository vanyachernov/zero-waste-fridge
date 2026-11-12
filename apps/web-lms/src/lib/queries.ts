import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { api, queryKeys, type ProductQuery } from "@zwf/api-client";

/** Поточний користувач (B-05). Без сесії — ApiError 401; не повторюємо. */
export const meQuery = queryOptions({ queryKey: queryKeys.me, queryFn: () => api.auth.me(), staleTime: Infinity, retry: false });

/** Сторінка продуктів (B-11). Попередня сторінка лишається на екрані, поки вантажиться наступна. */
export const productsQuery = (query: ProductQuery) =>
  queryOptions({ queryKey: queryKeys.productList(query), queryFn: () => api.products.list(query), placeholderData: keepPreviousData });

/** Усі активні продукти (для кулінарного конструктора): бекенд віддає до 100 на сторінку. */
export const activeProductsQuery = productsQuery({ sort: "expiry", size: 100 });

export const productSummaryQuery = queryOptions({ queryKey: queryKeys.productSummary, queryFn: () => api.products.summary() });

export const tipQuery = queryOptions({ queryKey: queryKeys.tip, queryFn: () => api.tips.today(), staleTime: 5 * 60_000 });

/** Довідники змінюються лише з релізом. */
export const dictionariesQuery = queryOptions({ queryKey: queryKeys.dictionaries, queryFn: () => api.dictionaries.get(), staleTime: Infinity });

export const recipesQuery = (ids: string[]) =>
  queryOptions({
    queryKey: queryKeys.recipes(ids),
    queryFn: () => api.recipes.suggest(ids),
    enabled: ids.length > 0,
    staleTime: 5 * 60_000,
  });

export const shoppingQuery = queryOptions({ queryKey: queryKeys.shoppingList, queryFn: () => api.shoppingList.get() });
