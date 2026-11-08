/**
 * Тимчасові ручні типи, що дзеркалять openapi/openapi.yaml.
 * Після `pnpm api:generate` їх можна замінити на `./generated/model`.
 */
export type Category = "vegetables" | "dairy" | "meat" | "fruits" | "sauces" | "other";
export type StorageZone = "fresh" | "middle" | "door" | "freezer";
export type Unit = "g" | "kg" | "ml" | "l" | "pcs";

export interface User {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface ProductCreate {
  name: string;
  brand?: string;
  category: Category;
  zone?: StorageZone;
  quantity: number;
  unit: Unit;
  /** ISO date (YYYY-MM-DD) */
  expiresAt: string;
}

export interface Product extends ProductCreate {
  id: string;
  addedAt: string;
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
