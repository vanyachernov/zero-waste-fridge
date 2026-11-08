import type { Product, ProductCreate, Recipe, ShoppingItem } from "./types";

/** In-memory бекенд для розробки UI без Spring Boot (VITE_API_MOCK=true). */

const DAY = 24 * 60 * 60 * 1000;
const isoIn = (days: number) => new Date(Date.now() + days * DAY).toISOString().slice(0, 10);
const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));
let seq = 100;

let products: Product[] = [
  { id: "p1", name: "Фарш яловичий свіжий", brand: "Фермерська м'ясо, охолоджене", category: "meat", zone: "fresh", quantity: 500, unit: "g", expiresAt: isoIn(-1), addedAt: new Date().toISOString() },
  { id: "p2", name: "Шпинат Baby свіжий", brand: "Органічна зелень, митий", category: "vegetables", zone: "fresh", quantity: 150, unit: "g", expiresAt: isoIn(0), addedAt: new Date().toISOString() },
  { id: "p3", name: "Грецький йогурт 5%", brand: "ТМ Галичина, банка", category: "dairy", zone: "door", quantity: 350, unit: "g", expiresAt: isoIn(1), addedAt: new Date().toISOString() },
  { id: "p4", name: "Філе куряче охолоджене", brand: "Еко-пакування", category: "meat", zone: "fresh", quantity: 650, unit: "g", expiresAt: isoIn(2), addedAt: new Date().toISOString() },
  { id: "p5", name: "Полуниця солодка", brand: "Лоток, локальний збір", category: "fruits", zone: "fresh", quantity: 300, unit: "g", expiresAt: isoIn(4), addedAt: new Date().toISOString() },
  { id: "p6", name: "Молоко пастеризоване 2.5%", brand: "Скляна пляшка багаторазова", category: "dairy", zone: "door", quantity: 1, unit: "l", expiresAt: isoIn(5), addedAt: new Date().toISOString() },
  { id: "p7", name: "Авокадо Хаас стигле", brand: "Ready-to-eat", category: "vegetables", zone: "middle", quantity: 2, unit: "pcs", expiresAt: isoIn(7), addedAt: new Date().toISOString() },
  { id: "p8", name: "Сир твердий Гауда 45%", brand: "Брусок у вощеній упаковці", category: "dairy", zone: "middle", quantity: 320, unit: "g", expiresAt: isoIn(14), addedAt: new Date().toISOString() },
  { id: "p9", name: "Яйця фермерські С0", brand: "10 шт", category: "other", zone: "door", quantity: 6, unit: "pcs", expiresAt: isoIn(4), addedAt: new Date().toISOString() },
  { id: "p10", name: "Кабачки / Цукіні", brand: "Місцевий фермер", category: "vegetables", zone: "fresh", quantity: 2, unit: "pcs", expiresAt: isoIn(3), addedAt: new Date().toISOString() },
  { id: "p11", name: "Соус песто", brand: "Скляна банка, відкрита", category: "sauces", zone: "door", quantity: 90, unit: "g", expiresAt: isoIn(6), addedAt: new Date().toISOString() },
];

let shopping: ShoppingItem[] = [
  { id: "s1", name: "Лимон", quantity: "1 шт", reason: "recipe", done: false },
  { id: "s2", name: "Молоко пастеризоване 2.5%", quantity: "1 л", reason: "low-stock", done: false },
  { id: "s3", name: "Цільнозерновий хліб", quantity: "1 шт", reason: "manual", done: true },
];

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
  async listProducts(): Promise<Product[]> {
    await delay();
    return [...products];
  },
  async createProduct(input: ProductCreate): Promise<Product> {
    await delay();
    const product: Product = { ...input, id: `p${++seq}`, addedAt: new Date().toISOString() };
    products = [product, ...products];
    return product;
  },
  async discardProduct(id: string): Promise<void> {
    await delay(150);
    products = products.filter((p) => p.id !== id);
  },
  async suggestRecipes(productIds: string[]): Promise<Recipe[]> {
    await delay(700);
    const selected = products.filter((p) => productIds.includes(p.id));
    return RECIPE_TEMPLATES.map((tpl, i) => {
      const used = selected.filter((p) => tpl.keys.some((k) => p.name.toLowerCase().includes(k.toLowerCase())));
      const matchPercent = Math.round(55 + (used.length / Math.max(selected.length, 1)) * 45);
      const { keys: _keys, ...recipe } = tpl;
      return { ...recipe, id: `r${i + 1}`, usedProductIds: used.map((p) => p.id), matchPercent };
    })
      .filter((r) => r.usedProductIds.length > 0)
      .sort((a, b) => b.matchPercent - a.matchPercent);
  },
  async getShoppingList(): Promise<ShoppingItem[]> {
    await delay();
    return [...shopping];
  },
  async toggleShoppingItem(id: string): Promise<void> {
    shopping = shopping.map((s) => (s.id === id ? { ...s, done: !s.done } : s));
  },
  async addShoppingItems(names: string[]): Promise<void> {
    const fresh = names
      .filter((n) => !shopping.some((s) => s.name === n))
      .map((name) => ({ id: `s${++seq}`, name, reason: "recipe" as const, done: false }));
    shopping = [...fresh, ...shopping];
  },
};
