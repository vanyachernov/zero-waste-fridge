import { act, screen, waitFor, within } from "@testing-library/react";
import { api, mockAuthControl } from "@zwf/api-client";
import { describe, expect, it } from "vitest";
import { renderApp, waitForPath } from "../../support/render";
import { pick } from "../../support/select";

/** F-20…F-30 + I-10: «Мій холодильник» на контракті бекенду (через мок, що його дзеркалить). */
const table = () => screen.getByRole("table");
/** jsdom не застосовує CSS: таблиця (десктоп) і картки (мобільний) обидві в DOM — працюємо з таблицею. */
const desktop = () => within(table().parentElement!);
const rowNames = () =>
  within(table())
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByText(/./)[0]!.textContent);

describe("fridge page", () => {
  it("shows server stats, the tip and the first page by urgency", async () => {
    renderApp("/", { signedIn: true });

    expect(await screen.findByRole("heading", { name: "Мій холодильник" })).toBeVisible();
    await waitFor(() => expect(rowNames()).toHaveLength(8));
    expect(rowNames()[0]).toBe("Фарш яловичий свіжий");
    expect(desktop().getByText("Показано 8 із 11 продуктів у холодильнику")).toBeVisible();
    expect(screen.getByRole("button", { name: /Всі продукти\s*\(11\)/ })).toHaveAttribute("aria-pressed", "true");
    expect(await screen.findByText("+11 за цей тиждень")).toBeVisible();

    const tip = await screen.findByRole("region", { name: "Розумна порада дня" });
    expect(tip).toHaveTextContent("Шпинат Baby свіжий та Грецький йогурт 5% закінчуються протягом 24 годин. Зробіть свіжий салат");
  });

  it("search, category, sort and page live in the URL", async () => {
    const { router, user } = renderApp("/", { signedIn: true });
    await waitFor(() => expect(rowNames()).toHaveLength(8));

    await user.click(desktop().getByRole("button", { name: "Сторінка 2" }));
    await waitForPath(router, "/?page=2");
    await waitFor(() => expect(rowNames()).toHaveLength(3));

    await user.click(screen.getByRole("button", { name: /Молочні продукти/ }));
    await waitForPath(router, "/?category=dairy");
    await waitFor(() => expect(rowNames()).toEqual(["Грецький йогурт 5%", "Молоко пастеризоване 2.5%", "Сир твердий Гауда 45%"]));

    await pick(user, screen.getByRole("combobox", { name: "Сортування" }), "name");
    await waitForPath(router, "/?category=dairy&sort=name");

    await user.type(screen.getByRole("searchbox", { name: /Пошук продуктів/ }), "гауда");
    await waitForPath(router, "/?category=dairy&sort=name&q=%D0%B3%D0%B0%D1%83%D0%B4%D0%B0");
    await waitFor(() => expect(rowNames()).toEqual(["Сир твердий Гауда 45%"]));

    await user.type(screen.getByRole("searchbox", { name: /Пошук продуктів/ }), "xyz");
    expect(await screen.findByText("Нічого не знайдено. Спробуйте змінити фільтр.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Скинути фільтри" }));
    await waitForPath(router, "/");
  });

  it("adds a product: defaults from the category, opened package preview, toast", async () => {
    const { user } = renderApp("/", { signedIn: true });
    await waitFor(() => expect(rowNames()).toHaveLength(8));

    await user.click(screen.getByRole("button", { name: "Додати продукт" }));
    const dialog = await screen.findByRole("dialog", { name: "Додати продукт" });
    await user.click(within(dialog).getByRole("button", { name: "Зберегти продукт" }));
    expect(within(dialog).getByText("Обов'язкове поле")).toBeVisible();

    await user.type(within(dialog).getByLabelText("Назва продукту *"), "Кефір 1%");
    await pick(user, within(dialog).getByLabelText("Категорія *"), "meat");
    expect(within(dialog).getByLabelText("Місце зберігання")).toHaveTextContent("Зона свіжості");
    expect(within(dialog).getByText("Залишилось 3 дні")).toBeVisible();
    await pick(user, within(dialog).getByLabelText("Категорія *"), "dairy");
    await user.clear(within(dialog).getByLabelText("Кількість *"));
    await user.type(within(dialog).getByLabelText("Кількість *"), "0,5");
    await user.click(within(dialog).getByRole("radio", { name: "л" }));
    await user.click(within(dialog).getByRole("switch", { name: "Упаковку вже відкрито" }));
    expect(within(dialog).getByText(/Відкритий продукт зберігається 3 дні — термін автоматично скорочено/)).toBeVisible();
    await user.click(within(dialog).getByRole("button", { name: "3 дні" }));
    await user.click(within(dialog).getByRole("button", { name: "Зберегти продукт" }));

    expect(await screen.findByText("«Кефір 1%» додано до холодильника")).toBeVisible();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const created = (await api.products.list({ q: "кефір" })).items[0]!;
    expect(created).toMatchObject({ quantity: 0.5, unit: "l", zone: "middle", openedShelfLifeDays: 3, remindBeforeDays: 3, daysLeft: 3 });
  });

  it("edits and opens a product from the row menu", async () => {
    const { user } = renderApp("/", { signedIn: true });
    await waitFor(() => expect(rowNames()).toHaveLength(8));

    await user.click(desktop().getByRole("button", { name: "Дії з продуктом Молоко пастеризоване 2.5%" }));
    await user.click(screen.getByRole("menuitem", { name: "Позначити відкритим" }));
    expect(await screen.findByText(/«Молоко пастеризоване 2.5%»: упаковку відкрито, термін — до/)).toBeVisible();
    await waitFor(async () => expect((await api.products.get("p6")).openedShelfLifeDays).toBe(3));

    await user.click(desktop().getByRole("button", { name: "Дії з продуктом Кабачки / Цукіні" }));
    await user.click(screen.getByRole("menuitem", { name: "Редагувати" }));
    const dialog = await screen.findByRole("dialog", { name: "Редагувати продукт" });
    expect(within(dialog).getByLabelText("Назва продукту *")).toHaveValue("Кабачки / Цукіні");
    await user.clear(within(dialog).getByLabelText("Назва продукту *"));
    await user.type(within(dialog).getByLabelText("Назва продукту *"), "Кабачки");
    await user.clear(within(dialog).getByLabelText("Бренд або примітка"));
    await user.click(within(dialog).getByRole("button", { name: "Зберегти зміни" }));

    expect(await screen.findByText("Зміни збережено")).toBeVisible();
    expect(await api.products.get("p10")).toMatchObject({ name: "Кабачки", brand: null });
  });

  it("server validation errors land on their fields", async () => {
    const { user } = renderApp("/", { signedIn: true });
    await waitFor(() => expect(rowNames()).toHaveLength(8));
    await user.click(screen.getByRole("button", { name: "Додати продукт" }));
    const dialog = await screen.findByRole("dialog", { name: "Додати продукт" });

    await user.type(within(dialog).getByLabelText("Назва продукту *"), "Сир");
    const purchased = within(dialog).getByLabelText("Дата покупки");
    await user.clear(purchased);
    await user.type(purchased, "2099-01-01");
    await user.click(within(dialog).getByRole("button", { name: "Зберегти продукт" }));

    expect(await within(dialog).findByText("Дата не може бути в майбутньому")).toBeVisible();
  });

  it("writes off with undo: nothing is sent when undone", async () => {
    const { user } = renderApp("/", { signedIn: true });
    await waitFor(() => expect(rowNames()).toHaveLength(8));

    await user.click(desktop().getByRole("button", { name: "Списати: Фарш яловичий свіжий" }));
    const dialog = await screen.findByRole("dialog", { name: "Списати продукт" });
    expect(within(dialog).getByRole("radio", { name: /Викинуто — зіпсувався/ })).toBeChecked();
    await user.click(within(dialog).getByRole("button", { name: "Списати продукт" }));

    expect(await screen.findByText(/Списано: Фарш яловичий свіжий/)).toBeVisible();
    await waitFor(() => expect(rowNames()).not.toContain("Фарш яловичий свіжий"));
    await user.click(screen.getByRole("button", { name: "Скасувати" }));

    await waitFor(() => expect(rowNames()).toContain("Фарш яловичий свіжий"));
    expect((await api.products.get("p1")).status).toBe("ACTIVE");
  });

  it("partial write-off is sent when leaving the page before the undo window ends", async () => {
    const { router, user } = renderApp("/", { signedIn: true });
    await waitFor(() => expect(rowNames()).toHaveLength(8));

    await user.click(desktop().getByRole("button", { name: "Дії з продуктом Грецький йогурт 5%" }));
    await user.click(screen.getByRole("menuitem", { name: "Списати" }));
    const dialog = await screen.findByRole("dialog", { name: "Списати продукт" });
    await user.click(within(dialog).getByRole("radio", { name: "Частину" }));
    await user.type(within(dialog).getByLabelText("Скільки списати, г"), "400");
    await user.click(within(dialog).getByRole("button", { name: "Списати продукт" }));
    expect(within(dialog).getByText("Більше, ніж залишилось")).toBeVisible();
    await user.clear(within(dialog).getByLabelText("Скільки списати, г"));
    await user.type(within(dialog).getByLabelText("Скільки списати, г"), "100");
    await user.click(within(dialog).getByRole("checkbox"));
    await user.click(within(dialog).getByRole("button", { name: "Списати продукт" }));
    expect(await screen.findByText("Списано 100 г — Грецький йогурт 5%")).toBeVisible();

    await act(() => router.navigate({ to: "/shopping" }));
    await waitFor(async () => expect((await api.products.get("p3")).quantity).toBe(250));
  });

  it("empty fridge for a new family offers to add the first product", async () => {
    mockAuthControl.signIn();
    await api.auth.register({ name: "Максим Кравченко", email: "max@zwf.app", password: "Secret-pass-1" });
    const { user } = renderApp("/");

    expect(await screen.findByRole("heading", { name: "Холодильник порожній" })).toBeVisible();
    expect(screen.queryByRole("region", { name: "Розумна порада дня" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Додати перший продукт" }));
    expect(await screen.findByRole("dialog", { name: "Додати продукт" })).toBeVisible();
  });

  it("dismissed tip stays hidden for the day", async () => {
    const first = renderApp("/", { signedIn: true });
    const tip = await screen.findByRole("region", { name: "Розумна порада дня" });
    await first.user.click(within(tip).getByRole("button", { name: "Закрити пораду" }));
    expect(screen.queryByRole("region", { name: "Розумна порада дня" })).not.toBeInTheDocument();
    first.unmount();

    renderApp("/", { signedIn: true });
    await screen.findByRole("heading", { name: "Мій холодильник" });
    await waitFor(() => expect(rowNames()).toHaveLength(8));
    expect(screen.queryByRole("region", { name: "Розумна порада дня" })).not.toBeInTheDocument();
  });
});
