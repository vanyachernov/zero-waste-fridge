import { screen, waitFor, within } from "@testing-library/react";
import { api, mockAuthControl } from "@zwf/api-client";
import { describe, expect, it } from "vitest";
import { renderApp, waitForPath } from "../../support/render";

/** F-40…F-45, F-82, F-83 на мок-бекенді, що дзеркалить B-20…B-24. */
describe("recipes", () => {
  it("header counters, recommended cards and sorting in the URL", async () => {
    const { router, user } = renderApp("/recipes", { signedIn: true });

    expect(await screen.findByRole("heading", { level: 1, name: "Розумні рецепти проти марнування їжі" })).toBeVisible();
    expect(await screen.findByText(/Врятовано від смітника: 1 продукт цього місяця/)).toBeVisible();
    expect(await screen.findByText(/3 продукти потребують термінового використання/)).toBeVisible();

    const recommended = screen.getByRole("region", { name: /Рецепти з продуктів, що скоро зіпсуються/ });
    const cards = await within(recommended).findAllByRole("listitem");
    expect(cards.length).toBeGreaterThan(1);
    expect(within(cards[0]!).getByText(/% збіг запасів/)).toBeVisible();
    expect(within(cards[0]!).getByText(/критичн/)).toBeVisible();
    expect(within(cards[0]!).getByRole("link", { name: "Переглянути рецепт" })).toBeVisible();

    await user.selectOptions(screen.getByRole("combobox", { name: "Сортування" }), "time");
    await waitForPath(router, "/recipes?sort=time");
  });

  it("constructor: pick 3 → generate → recipe page; missing goes to the shopping list", async () => {
    const { router, user } = renderApp("/recipes", { signedIn: true });
    const generate = (await screen.findAllByRole("button", { name: /Згенерувати/ }))[0]!;
    expect(generate).toBeDisabled();

    for (const name of ["Шпинат Baby свіжий", "Грецький йогурт 5%", "Сир твердий Гауда 45%"]) {
      await user.click(await screen.findByRole("checkbox", { name }));
    }
    expect(screen.getByText(/Обрано: 3 з 4 \(Готово до генерації\)/)).toBeVisible();
    expect(screen.getByText(/Чудово! Ви вибрали 3 складові/)).toBeVisible();
    expect(router.state.location.search).toEqual({ ids: ["p2", "p3", "p8"] });

    await user.click(screen.getByRole("button", { name: "Згенерувати ідеальний рецепт" }));
    expect(await screen.findByRole("status", { name: "" })).toHaveTextContent("Шеф-AI підбирає рецепт…");

    expect(await screen.findByRole("heading", { level: 1, name: "Теплий кіш без тіста зі шпинатом, йогуртом та сиром Гауда" })).toBeVisible();
    await waitForPath(router, "/recipes/recipe-crustless-quiche");
    expect(screen.getByText("З вашого холодильника · 4")).toBeVisible();
    expect(screen.getByText(/Економія ~180 ₴/)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Покрокове приготування" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "+ У список: Мускатний горіх" }));
    expect(await screen.findByRole("button", { name: "Додано: Мускатний горіх" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Додано до списку покупок" })).toBeDisabled();
    await waitFor(async () => expect((await api.shoppingList.get()).toBuy.map((i) => i.name)).toContain("Мускатний горіх"));
  });

  it("cook dialog: portions and products to write off, then back to the fridge", async () => {
    const { router, user } = renderApp("/recipes/recipe-crustless-quiche", { signedIn: true });
    await screen.findByRole("heading", { level: 1, name: /Теплий кіш/ });

    await user.click(screen.getAllByRole("button", { name: "Приготувати і списати" })[0]!);
    const dialog = await screen.findByRole("dialog", { name: "Приготувати і списати" });
    expect(within(dialog).getByText("4")).toBeVisible();
    // 4 порції: шпинату треба 150 г — увесь; йогурту 200 г з 350 г
    expect(within(dialog).getByText("увесь продукт")).toBeVisible();
    expect(within(dialog).getByText("200 г з 350 г")).toBeVisible();

    await user.click(within(dialog).getByRole("button", { name: "−1" }));
    await user.click(within(dialog).getByRole("button", { name: "−1" }));
    expect(within(dialog).getByText("75 г з 150 г")).toBeVisible();
    await user.click(within(dialog).getByRole("checkbox", { name: "Яйця фермерські С0" }));

    await user.click(within(dialog).getByRole("button", { name: "Приготувати і списати" }));
    expect(await screen.findByText("Смачного! Списано 3 продукти — вони в «Врятовано»")).toBeVisible();
    await waitForPath(router, "/");
    expect((await api.products.get("p2")).quantity).toBe(75);
    expect((await api.products.get("p9")).quantity).toBe(6);
  });

  it("nothing matches → asks to change the products", async () => {
    mockAuthControl.signIn();
    await api.products.create({ name: "Квас", category: "other", quantity: 1, unit: "l", expiresAt: "2099-01-01" } as never);
    await api.products.create({ name: "Халва", category: "other", quantity: 1, unit: "pcs", expiresAt: "2099-01-01" } as never);
    await api.products.create({ name: "Мармелад", category: "other", quantity: 1, unit: "pcs", expiresAt: "2099-01-01" } as never);
    const { user } = renderApp("/recipes", { signedIn: true });
    for (const name of ["Квас", "Халва", "Мармелад"]) await user.click(await screen.findByRole("checkbox", { name }));
    await user.click(screen.getByRole("button", { name: "Згенерувати ідеальний рецепт" }));
    expect(await screen.findByText(/З цих продуктів нічого не вийшло/)).toBeVisible();
  });

  it("unknown recipe shows not found with a way back", async () => {
    const { user, router } = renderApp("/recipes/nope", { signedIn: true });
    expect(await screen.findByText(/Рецепт не знайдено/)).toBeVisible();
    await user.click(screen.getByRole("link", { name: "До рецептів" }));
    await waitForPath(router, "/recipes");
  });

  it("mobile wizard (F-82): step 1 of 2 with selected names and the generate button in the footer", async () => {
    const { user } = renderApp("/recipes?ids=%5B%22p2%22%2C%22p3%22%5D", { signedIn: true });
    expect(await screen.findByText("Крок 1 з 2")).toBeInTheDocument();
    expect(await screen.findByText("Шпинат, Грецький")).toBeInTheDocument();
    const footerButton = screen.getByRole("button", { name: "Згенерувати рецепт" });
    expect(footerButton).toBeDisabled();
    await user.click(await screen.findByRole("checkbox", { name: "Сир твердий Гауда 45%" }));
    expect(footerButton).toBeEnabled();
  });
});
