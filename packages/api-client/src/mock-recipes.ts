import catalogFile from "../../../apps/api/src/main/resources/recipes/catalog.json";
import { ApiError } from "./http";
import { requireMockSession } from "./mock-auth";
import type {
  CookRequest,
  CookResult,
  Difficulty,
  Product,
  RecipeCard,
  RecipeDetail,
  RecipeFromFridge,
  RecipeMissing,
  RecipeSort,
  RecipeSource,
  Unit,
  WriteOffRequest,
  WriteOffResult,
} from "./types";

/**
 * In-memory B-20…B-23 — той самий каталог (`apps/api/.../recipes/catalog.json`) і ті самі правила підбору, що й на
 * бекенді (RecipeMatcher). Без AI: генерація підбирає найкращий рецепт каталогу, як бекенд без ключа DeepSeek.
 */

interface Ingredient {
  name: string;
  quantity: number | null;
  unit: Unit | null;
  note: string | null;
  keywords: string[];
  pantry: boolean;
  substitutes: string[];
}

interface MockRecipe {
  id: string;
  source: RecipeSource;
  title: string;
  description: string | null;
  imageUrl: string | null;
  minutes: number;
  kcal: number;
  servings: number;
  difficulty: Difficulty;
  savingsUah: number | null;
  ingredients: Ingredient[];
  steps: { title: string | null; text: string }[];
}

const CATALOG: MockRecipe[] = catalogFile.recipes.map((r) => ({
  id: `recipe-${r.slug}`,
  source: "CATALOG",
  title: r.title,
  description: r.description ?? null,
  imageUrl: r.imageUrl ?? null,
  minutes: r.minutes,
  kcal: r.kcal,
  servings: r.servings,
  difficulty: r.difficulty as Difficulty,
  savingsUah: r.savingsUah ?? null,
  ingredients: r.ingredients.map((i) => ({
    name: i.name,
    quantity: i.unit ? (i.quantity ?? null) : null,
    unit: (i.quantity !== null && i.unit ? i.unit : null) as Unit | null,
    note: i.note ?? null,
    keywords: i.keywords.map((k) => k.trim().toLowerCase()).filter(Boolean),
    pantry: i.pantry,
    substitutes: i.substitutes ?? [],
  })),
  steps: r.steps.map((s) => ({ title: s.title ?? null, text: s.text })),
}));

const CRITICAL_DAYS = 2;
const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

interface Match {
  recipe: MockRecipe;
  used: { ingredient: Ingredient; product: Product }[];
  missing: Ingredient[];
  pantry: Ingredient[];
}

function match(recipe: MockRecipe, fridge: Product[]): Match {
  const candidates = fridge.filter((p) => p.status === "ACTIVE" && p.daysLeft >= 0).sort((a, b) => a.daysLeft - b.daysLeft);
  const taken = new Set<string>();
  const result: Match = { recipe, used: [], missing: [], pantry: [] };
  for (const ingredient of recipe.ingredients) {
    const product = candidates.find((p) => !taken.has(p.id) && ingredient.keywords.some((k) => p.name.toLowerCase().includes(k)));
    if (product) {
      taken.add(product.id);
      result.used.push({ ingredient, product });
    } else (ingredient.pantry ? result.pantry : result.missing).push(ingredient);
  }
  return result;
}

const matchPercent = (m: Match) => {
  const required = m.used.length + m.missing.length;
  return required === 0 ? 0 : Math.round((100 * m.used.length) / required);
};
const criticalCount = (m: Match) => m.used.filter((u) => u.product.daysLeft <= CRITICAL_DAYS).length;
const score = (m: Match) => criticalCount(m) * 100 + matchPercent(m) - m.missing.length * 3;

const fromFridge = (u: Match["used"][number]): RecipeFromFridge => ({
  productId: u.product.id,
  name: u.product.name,
  quantity: u.ingredient.quantity,
  unit: u.ingredient.unit,
  note: u.ingredient.note,
  daysLeft: u.product.daysLeft,
  available: u.product.quantity,
  availableUnit: u.product.unit,
});
const missing = (i: Ingredient): RecipeMissing => ({ name: i.name, quantity: i.quantity, unit: i.unit, note: i.note, substitutes: i.substitutes });

function card(m: Match): RecipeCard {
  const r = m.recipe;
  return {
    id: r.id, title: r.title, imageUrl: r.imageUrl, minutes: r.minutes, kcal: r.kcal, servings: r.servings, difficulty: r.difficulty,
    source: r.source, matchPercent: matchPercent(m), criticalCount: criticalCount(m), fromFridge: m.used.map(fromFridge), missing: m.missing.map(missing),
  };
}

function detail(m: Match): RecipeDetail {
  return {
    ...card(m),
    description: m.recipe.description,
    savingsUah: m.recipe.savingsUah,
    pantry: m.pantry.map((i) => ({ name: i.name, note: i.note })),
    steps: m.recipe.steps,
  };
}

const MASS: Partial<Record<Unit, number>> = { g: 1, kg: 1000 };
const VOLUME: Partial<Record<Unit, number>> = { ml: 1, l: 1000 };

/** Як Quantities.convert на бекенді: г ↔ кг, мл ↔ л, шт; інакше — null. */
export function convertQuantity(quantity: number | null, from: Unit | null, to: Unit): number | null {
  if (quantity === null || from === null) return null;
  if (from === to) return quantity;
  for (const table of [MASS, VOLUME]) {
    if (table[from] && table[to]) return Math.round(((quantity * table[from]!) / table[to]!) * 1000) / 1000;
  }
  return null;
}

function validation(errors: Record<string, string>) {
  return new ApiError(400, "Request validation failed", { code: "VALIDATION_FAILED", fieldErrors: errors });
}

function find(id: string): MockRecipe {
  const recipe = CATALOG.find((r) => r.id === id);
  if (!recipe) throw new ApiError(404, "Recipe not found", { code: "RECIPE_NOT_FOUND" });
  return recipe;
}

const ORDER: Record<RecipeSort, (a: Match, b: Match) => number> = {
  critical: (a, b) => score(b) - score(a),
  match: (a, b) => matchPercent(b) - matchPercent(a) || score(b) - score(a),
  time: (a, b) => a.recipe.minutes - b.recipe.minutes || score(b) - score(a),
  kcal: (a, b) => a.recipe.kcal - b.recipe.kcal || score(b) - score(a),
};

export const mockRecipes = {
  async recommended(fridge: Product[], sort: RecipeSort = "critical", limit = 6): Promise<RecipeCard[]> {
    requireMockSession();
    await delay(300);
    return CATALOG.map((r) => match(r, fridge))
      .filter((m) => m.used.length > 0)
      .sort((a, b) => score(b) - score(a) || a.recipe.title.localeCompare(b.recipe.title))
      .slice(0, Math.min(Math.max(limit, 1), 24))
      .sort((a, b) => (ORDER[sort] ?? ORDER.critical)(a, b) || a.recipe.title.localeCompare(b.recipe.title))
      .map(card);
  },

  async generate(fridge: Product[], productIds: string[]): Promise<RecipeDetail> {
    requireMockSession();
    await delay(900);
    const ids = [...new Set(productIds ?? [])];
    if (ids.length < 3 || ids.length > 4) throw validation({ productIds: "Size" });
    const selected = ids.map((id) => fridge.find((p) => p.id === id));
    if (selected.some((p) => !p || p.status !== "ACTIVE" || p.daysLeft < 0)) throw validation({ productIds: "INVALID" });
    const usesSelected = (m: Match) => m.used.filter((u) => ids.includes(u.product.id)).length;
    const best = CATALOG.map((r) => match(r, fridge))
      .filter((m) => usesSelected(m) > 0)
      .sort((a, b) => usesSelected(b) - usesSelected(a) || score(b) - score(a) || a.recipe.title.localeCompare(b.recipe.title))[0];
    if (!best) throw new ApiError(422, "No recipe for the selected products", { code: "NO_RECIPE" });
    return detail(best);
  },

  async get(fridge: Product[], id: string): Promise<RecipeDetail> {
    requireMockSession();
    await delay(150);
    return detail(match(find(id), fridge));
  },

  async cook(
    fridge: Product[],
    id: string,
    request: CookRequest,
    writeOff: (productId: string, request: WriteOffRequest) => Promise<WriteOffResult>,
  ): Promise<CookResult> {
    requireMockSession();
    const recipe = find(id);
    const portions = request?.portions ?? recipe.servings;
    if (!Number.isInteger(portions) || portions < 1 || portions > 12) throw validation({ portions: "Range" });
    const only = request?.productIds ? new Set(request.productIds) : null;
    const used = match(recipe, fridge).used.filter((u) => !only || only.has(u.product.id));
    if (!used.length) throw validation({ productIds: "EMPTY" });
    const cooked: CookResult["cooked"] = [];
    for (const { ingredient, product } of used) {
      const scaled = ingredient.quantity === null ? null : Math.round(((ingredient.quantity * portions) / recipe.servings) * 1000) / 1000;
      const amount = convertQuantity(scaled, ingredient.unit, product.unit);
      const partial = amount !== null && amount > 0 && amount < product.quantity;
      const result = await writeOff(product.id, { outcome: "COOKED", quantity: partial ? amount : "all" });
      cooked.push({ productId: product.id, name: product.name, quantity: result.writtenOff.quantity, unit: result.writtenOff.unit, closed: result.writtenOff.closed });
    }
    return { recipeId: id, portions, cooked };
  },
};
