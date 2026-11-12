import { screen, waitFor, within } from "@testing-library/react";
import { api } from "@zwf/api-client";
import { describe, expect, it } from "vitest";
import { renderApp } from "../../support/render";

/** F-50…F-53 + I-40: «Розумний список покупок». */
const section = (name: string) => within(screen.getByRole("heading", { name: new RegExp(name) }).closest("section")!);
const names = (name: string) =>
  section(name)
    .queryAllByRole("listitem")
    .map((li) => li.querySelector("span.font-bold")?.textContent);

describe("shopping list page", () => {
  it("shows sections, stats and tags from the server", async () => {
    renderApp("/shopping", { signedIn: true });

    expect(await screen.findByRole("heading", { name: "Розумний список покупок" })).toBeVisible();
    await waitFor(() => expect(names("Треба купити")).toHaveLength(6));
    expect(names("Треба купити")[0]).toBe("Куряче філе охолоджене");
    expect(names("Вже куплено")).toHaveLength(4);
    expect(await screen.findByText("4 з 10")).toBeVisible();
    expect(screen.getByText("орієнтовно 408 ₴")).toBeVisible();
    expect(screen.getAllByText("Закінчився вчора в холодильнику")).toHaveLength(2);
    expect(screen.getByText("Пріоритет: Високий")).toBeVisible();
    expect(screen.getByText("~74 ₴")).toBeVisible();
    expect(screen.getByText(/Додано: Максим Кравченко/)).toBeVisible();
    expect(await screen.findByText("Олена (Ви), Максим, Софія • 3 учасники")).toBeVisible();
    expect(screen.getByRole("link", { name: "Запросити члена сім'ї" })).toHaveAttribute("href", "/lms/family");
    expect(screen.getByRole("region", { name: "Автопоповнення із залишків холодильника" })).toHaveTextContent(
      "Шпинат Baby свіжий, Грецький йогурт 5% закінчилися або списані",
    );
  });

  it("toggles, changes quantity, removes and clears bought", async () => {
    const { user } = renderApp("/shopping", { signedIn: true });
    await waitFor(() => expect(names("Треба купити")).toHaveLength(6));

    await user.click(screen.getByRole("button", { name: "Більше: Шпинат Baby свіжий" }));
    await waitFor(async () => expect((await api.shoppingList.get()).toBuy.find((i) => i.id === "s1")!.quantity).toBe(200));

    await user.click(screen.getByRole("button", { name: "Позначити купленим: Банани стиглі" }));
    await waitFor(() => expect(names("Вже куплено")[0]).toBe("Банани стиглі"));
    expect(names("Треба купити")).not.toContain("Банани стиглі");

    await user.click(screen.getByRole("button", { name: "Видалити: Яйця курячі органічні С0" }));
    await waitFor(() => expect(names("Треба купити")).not.toContain("Яйця курячі органічні С0"));

    await user.click(screen.getByRole("button", { name: "Очистити куплені" }));
    await waitFor(() => expect(screen.queryByRole("heading", { name: /Вже куплено/ })).not.toBeInTheDocument());
    expect((await api.shoppingList.get()).bought).toHaveLength(0);
  });

  it("filters by store and by items from the fridge", async () => {
    const { user } = renderApp("/shopping", { signedIn: true });
    await waitFor(() => expect(names("Треба купити")).toHaveLength(6));

    await user.click(screen.getByRole("button", { name: "Сільпо (4)" }));
    expect(names("Треба купити")).toHaveLength(4);
    await user.click(screen.getByRole("button", { name: "З холодильника (2)" }));
    expect(names("Треба купити")).toEqual(["Шпинат Baby свіжий", "Грецький йогурт 5%"]);
    await user.click(screen.getByRole("button", { name: "Всі (6)" }));
    expect(names("Треба купити")).toHaveLength(6);
  });

  it("quick add parses the quantity and keeps category and store", async () => {
    const { user } = renderApp("/shopping", { signedIn: true });
    await waitFor(() => expect(names("Треба купити")).toHaveLength(6));

    await user.type(screen.getByRole("textbox", { name: "Що купити" }), "Кефір 1% 2 л");
    await user.selectOptions(screen.getByRole("combobox", { name: "Категорія" }), "dairy");
    await user.selectOptions(screen.getByRole("combobox", { name: "Магазин" }), "st2");
    await user.click(screen.getByRole("button", { name: "Додати до списку" }));

    expect(await screen.findByText("«Кефір 1%» додано до списку")).toBeVisible();
    await waitFor(() => expect(names("Треба купити")).toContain("Кефір 1%"));
    expect((await api.shoppingList.get()).toBuy.find((i) => i.name === "Кефір 1%")).toMatchObject({ quantity: 2, unit: "l", category: "dairy", store: { name: "Еко-лавка" } });
    expect(screen.getByRole("textbox", { name: "Що купити" })).toHaveValue("");
  });

  it("moves bought items to the fridge with corrected dates", async () => {
    const { user } = renderApp("/shopping", { signedIn: true });
    await waitFor(() => expect(names("Вже куплено")).toHaveLength(4));

    await user.click(screen.getByRole("button", { name: "Додати в Холодильник (В 1 клік)" }));
    const dialog = await screen.findByRole("dialog", { name: "Перенести в холодильник" });
    const bread = within(dialog).getByLabelText("Термін придатності: Хліб цільнозерновий на заквасці");
    await waitFor(() => expect(bread).not.toHaveValue(""));
    await user.selectOptions(within(dialog).getByLabelText("Місце зберігання: Хліб цільнозерновий на заквасці"), "freezer");
    await user.click(within(dialog).getByRole("button", { name: "Перенести (4)" }));

    expect(await screen.findByText("4 продукти перенесено в холодильник")).toBeVisible();
    await waitFor(() => expect(screen.queryByRole("heading", { name: /Вже куплено/ })).not.toBeInTheDocument());
    expect((await api.products.list({ q: "хліб" })).items[0]).toMatchObject({ zone: "freezer", unit: "pcs" });
  });

  it("Smart Sync settings switch the banner", async () => {
    const { user } = renderApp("/shopping", { signedIn: true });
    await user.click(await screen.findByRole("button", { name: "Налаштувати автопоповнення" }));
    const dialog = await screen.findByRole("dialog", { name: "Автопоповнення" });
    const toggle = within(dialog).getByRole("switch", { name: "Додавати продукти, що закінчилися" });
    await waitFor(() => expect(toggle).toBeEnabled());
    expect(toggle).toHaveAttribute("aria-checked", "true");
    await user.click(toggle);
    await user.click(within(dialog).getByRole("button", { name: "Зберегти" }));

    expect(await screen.findByText("Налаштування автопоповнення збережено")).toBeVisible();
    expect(screen.getByRole("region", { name: "Автопоповнення із залишків холодильника" })).toHaveTextContent("Автопоповнення вимкнено");
    expect(await api.shoppingList.settings()).toEqual({ autoRefill: false, excludedCategories: [] });
  });

  it("shares the list via clipboard when Web Share is unavailable", async () => {
    // user-event підставляє власний буфер обміну; Web Share API в jsdom немає
    const { user } = renderApp("/shopping", { signedIn: true });
    await waitFor(() => expect(names("Треба купити")).toHaveLength(6));

    await user.click(screen.getByRole("button", { name: "Поділитися списком" }));

    expect(await screen.findByText("Список скопійовано в буфер обміну")).toBeVisible();
    expect(await navigator.clipboard.readText()).toContain("• Шпинат Baby свіжий — 150 г (Сільпо)");
  });

  it("product written off in the fridge with the checkbox appears in the list", async () => {
    const { user } = renderApp("/", { signedIn: true });
    const table = within((await screen.findByRole("table")).parentElement!);
    await user.click(await table.findByRole("button", { name: "Дії з продуктом Сир твердий Гауда 45%" }).catch(async () => {
      await user.click(table.getByRole("button", { name: "Сторінка 2" }));
      return table.findByRole("button", { name: "Дії з продуктом Сир твердий Гауда 45%" });
    }));
    await user.click(screen.getByRole("menuitem", { name: "Списати" }));
    const dialog = await screen.findByRole("dialog", { name: "Списати продукт" });
    expect(within(dialog).getByRole("checkbox")).toBeChecked();
    await user.click(within(dialog).getByRole("button", { name: "Списати продукт" }));
    expect(await screen.findByText(/Списано: Сир твердий Гауда 45% і додано до списку покупок/)).toBeVisible();

    await user.click(screen.getAllByRole("link", { name: /Список покупок|Покупки/ })[0]!);
    await waitFor(() => expect(names("Треба купити")).toContain("Сир твердий Гауда 45%"));
  });
});
