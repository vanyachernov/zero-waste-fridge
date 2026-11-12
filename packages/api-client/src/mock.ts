import { requireMockSession } from "./mock-auth";
import type { Product, Recipe } from "./types";

/** In-memory рецепти для розробки UI без бекенду рецептів (B-20…B-24 ще немає). */

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

const RECIPE_TEMPLATES: Array<Omit<Recipe, "id" | "usedProductIds" | "matchPercent"> & { keys: string[] }> = [
  {
    title: "Зелений вітамінний смузі зі шпинатом та йогуртом",
    imageUrl: "https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=800&q=70",
    minutes: 10, kcal: 210, difficulty: "easy", keys: ["Шпинат", "йогурт", "Полуниця", "Молоко"],
    ingredients: ["Шпинат Baby — 80 г", "Грецький йогурт — 150 г", "Полуниця — 100 г", "Мед — 1 ч. л."],
    missing: ["Мед"],
    steps: ["Промийте шпинат і полуницю.", "Збийте всі інгредієнти в блендері до однорідності.", "Подавайте одразу, прикрасивши ягодами."],
  },
  {
    title: "Запечене куряче філе з овочами та сирною скоринкою",
    imageUrl: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&q=70",
    minutes: 35, kcal: 420, difficulty: "medium", keys: ["Філе", "Сир", "Кабачки", "Шпинат"],
    ingredients: ["Філе куряче — 400 г", "Кабачок — 1 шт", "Сир Гауда — 100 г", "Шпинат — 50 г", "Перець болгарський — 1 шт"],
    missing: ["Перець болгарський"],
    steps: ["Наріжте філе та овочі кубиками.", "Викладіть у форму, посоліть, поперчіть.", "Посипте тертим сиром і запікайте 25 хв при 200°C."],
  },
  {
    title: "Омлет фриттата зі шпинатом та сиром",
    imageUrl: "https://images.unsplash.com/photo-1510693206972-df098062cb71?w=800&q=70",
    minutes: 20, kcal: 330, difficulty: "easy", keys: ["Яйця", "Шпинат", "Сир", "Молоко", "Кабачки"],
    ingredients: ["Яйця — 4 шт", "Шпинат Baby — 70 г", "Сир Гауда — 60 г", "Молоко — 50 мл"],
    missing: [],
    steps: ["Збийте яйця з молоком.", "Обсмажте шпинат 1 хв, залийте яєчною сумішшю.", "Посипте сиром і доведіть під кришкою 8–10 хв."],
  },
  {
    title: "Паста з фаршем, кабачком і песто",
    imageUrl: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=70",
    minutes: 25, kcal: 560, difficulty: "medium", keys: ["Фарш", "Кабачки", "песто", "Сир"],
    ingredients: ["Паста — 250 г", "Фарш — 300 г", "Кабачок — 1 шт", "Соус песто — 3 ст. л."],
    missing: ["Паста"],
    steps: ["Відваріть пасту al dente.", "Обсмажте фарш, додайте кабачок.", "Змішайте з пастою та песто."],
  },
];

export const mockApi = {
  /** Продукти вже завантажені фасадом (з моку холодильника або з бекенду). */
  async suggestRecipes(selected: Product[]): Promise<Recipe[]> {
    requireMockSession();
    await delay(700);
    return RECIPE_TEMPLATES.map((tpl, i) => {
      const used = selected.filter((p) => tpl.keys.some((k) => p.name.toLowerCase().includes(k.toLowerCase())));
      const matchPercent = Math.round(55 + (used.length / Math.max(selected.length, 1)) * 45);
      const { keys: _keys, ...recipe } = tpl;
      return { ...recipe, id: `r${i + 1}`, usedProductIds: used.map((p) => p.id), matchPercent };
    })
      .filter((r) => r.usedProductIds.length > 0)
      .sort((a, b) => b.matchPercent - a.matchPercent);
  },
};
