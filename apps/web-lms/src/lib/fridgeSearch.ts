import type { Category, Freshness, ProductQuery, ProductSort } from "@zwf/api-client";

/** F-21: стан екрана «Мій холодильник» у URL — посиланням можна поділитися, «Назад» працює. */
export interface FridgeSearch {
  q?: string;
  category?: Category;
  freshness?: Freshness[];
  sort?: ProductSort;
  view?: "table" | "cards";
  page?: number;
}

export const PAGE_SIZE = 8;

const CATEGORIES: readonly Category[] = ["vegetables", "dairy", "meat", "fruits", "sauces", "other"];
const FRESHNESS: readonly Freshness[] = ["expired", "today", "soon", "fresh"];
const SORTS: readonly ProductSort[] = ["expiry", "name", "added", "category"];

/** Невідомі значення з адресного рядка відкидаються, а не ламають запит до API (400). */
export function validateFridgeSearch(search: Record<string, unknown>): FridgeSearch {
  const result: FridgeSearch = {};
  if (typeof search.q === "string" && search.q.trim()) result.q = search.q.trim().slice(0, 120);
  if (CATEGORIES.includes(search.category as Category)) result.category = search.category as Category;
  const freshness = (Array.isArray(search.freshness) ? search.freshness : typeof search.freshness === "string" ? search.freshness.split(",") : [])
    .map(String)
    .filter((f): f is Freshness => FRESHNESS.includes(f as Freshness));
  if (freshness.length) result.freshness = [...new Set(freshness)];
  if (SORTS.includes(search.sort as ProductSort) && search.sort !== "expiry") result.sort = search.sort as ProductSort;
  if (search.view === "cards") result.view = "cards";
  const page = Number(search.page);
  if (Number.isInteger(page) && page > 1) result.page = page;
  return result;
}

export function toProductQuery(search: FridgeSearch): ProductQuery {
  return {
    q: search.q,
    category: search.category ? [search.category] : undefined,
    freshness: search.freshness,
    sort: search.sort ?? "expiry",
    page: search.page ?? 1,
    size: PAGE_SIZE,
  };
}
