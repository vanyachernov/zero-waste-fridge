import type { Category } from "@zwf/api-client";

/** Емодзі категорій із макетів (поле «Категорія», швидке додавання в список покупок). */
export const CATEGORY_EMOJI: Record<Category, string> = {
  vegetables: "🥦",
  dairy: "🥛",
  meat: "🥩",
  fruits: "🍓",
  sauces: "🥫",
  other: "📦",
};

export const CATEGORY_ORDER: readonly Category[] = ["vegetables", "dairy", "meat", "fruits", "sauces", "other"];
