import type { Messages } from "./uk";

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

/** Англійська — часткова, відсутні ключі беруться з української. */
export const en: DeepPartial<Messages> = {
  brand: { name: "Zero Waste Fridge", tagline: "Save food — save the planet" },
  nav: { fridge: "My fridge", recipes: "Leftover recipes", stats: "Stats & Ecology", shopping: "Shopping list", login: "Log in", openApp: "Open app" },
  landing: {
    eyebrow: "Smart food inventory",
    title: "Eat fresh. Waste nothing.",
    subtitle: "Zero Waste Fridge tracks expiry dates, suggests recipes from food about to spoil and builds your shopping list.",
    ctaPrimary: "Start for free",
    ctaSecondary: "How it works",
  },
  fridge: { title: "My fridge", add: "Add product", getRecipe: "Find a recipe" },
};
