import { screen, waitFor, within } from "@testing-library/react";
import { api, DEMO_ACCOUNT, mockAuthControl, mockHouseholdControl } from "@zwf/api-client";
import { describe, expect, it } from "vitest";
import { renderApp, waitForPath } from "../../support/render";

/** F-60…F-62 + I-50: «Моя сім'я» і вступ (F-61). */
const membersTable = async () => within((await screen.findByRole("heading", { name: /Учасники/ })).closest("div.overflow-hidden") as HTMLElement);

describe("family page — owner", () => {
  it("shows members with roles and last activity, pending invite and the role matrix", async () => {
    renderApp("/family", { signedIn: true });

    expect(await screen.findByRole("heading", { name: "Моя сім'я" })).toBeVisible();
    const table = await membersTable();
    await waitFor(() => expect(table.getByText("Софія Кравченко")).toBeVisible());
    expect(table.getByText(/Сім'я Кравченко» · 3 учасники, 1 запрошення/)).toBeVisible();
    expect(table.getByText(/olena@example.com · Ви/)).toBeVisible();
    expect(table.getByText("Користувач")).toBeVisible();
    expect(table.getAllByText("Член сім'ї")).toHaveLength(2);
    expect(table.getByText(/Додано «Молоко пастеризоване 2.5%» · 10 хв тому/)).toBeVisible();
    expect(table.getByText(/Списано «Грецький йогурт 5%» · вчора/)).toBeVisible();
    expect(table.getByText("andriy.k@gmail.com")).toBeVisible();
    expect(table.getByText("Очікує")).toBeVisible();

    const matrix = within(screen.getByRole("heading", { name: "Ролі та права доступу" }).closest("div.overflow-hidden") as HTMLElement);
    const row = matrix.getByText("Запрошувати та видаляти учасників").closest("tr")!;
    expect(within(row).getByRole("img", { name: "Дозволено" })).toBeVisible();
    expect(within(row).getByRole("img", { name: "Недоступно" })).toBeVisible();
    expect(await screen.findByText("ZWF-4821-KR")).toBeVisible();
  });

  it("invites by email, shows duplicates on the field and cancels", async () => {
    const { user } = renderApp("/family", { signedIn: true });
    const email = await screen.findByLabelText("Електронна пошта");

    await user.type(email, "new@zwf.app");
    await user.click(screen.getByRole("button", { name: "Надіслати запрошення" }));
    expect(await screen.findByText("Запрошення надіслано на new@zwf.app")).toBeVisible();
    expect(await (await membersTable()).findByText("new@zwf.app")).toBeVisible();
    expect(mockHouseholdControl.lastInviteLink()).toMatch(/^\/lms\/join\?invite=/);

    await user.type(email, "new@zwf.app");
    await user.click(screen.getByRole("button", { name: "Надіслати запрошення" }));
    expect(await screen.findByText("Запрошення вже надіслано")).toBeVisible();

    await user.click((await membersTable()).getByRole("button", { name: "Дії із запрошенням new@zwf.app" }));
    await user.click(screen.getByRole("menuitem", { name: "Скасувати запрошення" }));
    await waitFor(async () => expect((await membersTable()).queryByText("new@zwf.app")).not.toBeInTheDocument());
  });

  it("copies and regenerates the family code", async () => {
    const { user } = renderApp("/family", { signedIn: true });
    await screen.findByText("ZWF-4821-KR");

    await user.click(screen.getByRole("button", { name: "Скопіювати код" }));
    expect(await screen.findByText("Код скопійовано")).toBeVisible();
    expect(await navigator.clipboard.readText()).toBe("ZWF-4821-KR");

    await user.click(screen.getByRole("button", { name: "Новий код" }));
    await waitFor(() => expect(screen.getByTestId("family-code")).not.toHaveTextContent("ZWF-4821-KR"));
  });

  it("changes roles, protects the last owner and removes a member", async () => {
    const { user } = renderApp("/family", { signedIn: true });
    const table = await membersTable();
    await table.findByText("Максим Кравченко");

    await user.click(table.getByRole("button", { name: "Дії з учасником Олена Кравченко" }));
    await user.click(screen.getByRole("menuitem", { name: "Зробити членом сім'ї" }));
    expect(await screen.findByText("У сім'ї має лишитися хоча б один власник. Спершу призначте іншого.")).toBeVisible();

    await user.click(table.getByRole("button", { name: "Дії з учасником Максим Кравченко" }));
    await user.click(screen.getByRole("menuitem", { name: "Зробити власником" }));
    expect(await screen.findByText("Роль змінено")).toBeVisible();
    await waitFor(() => expect(table.getAllByText("Користувач")).toHaveLength(2));

    await user.click(table.getByRole("button", { name: "Дії з учасником Софія Кравченко" }));
    await user.click(screen.getByRole("menuitem", { name: "Видалити з сім'ї" }));
    expect(await screen.findByText("Софія Кравченко більше не в сім'ї")).toBeVisible();
    await waitFor(() => expect(table.queryByText("Софія Кравченко")).not.toBeInTheDocument());
  });

  it("deletes the household with the password", async () => {
    const { user, router } = renderApp("/family", { signedIn: true });
    await user.click(await screen.findByRole("button", { name: "Видалити сім'ю" }));
    const dialog = await screen.findByRole("dialog", { name: "Видалити сім'ю?" });

    await user.type(within(dialog).getByLabelText("Ваш пароль"), "wrong-pass");
    await user.click(within(dialog).getByRole("button", { name: "Видалити назавжди" }));
    expect(await within(dialog).findByText("Неправильний пароль")).toBeVisible();

    await user.clear(within(dialog).getByLabelText("Ваш пароль"));
    await user.type(within(dialog).getByLabelText("Ваш пароль"), DEMO_ACCOUNT.password);
    await user.click(within(dialog).getByRole("button", { name: "Видалити назавжди" }));

    await waitForPath(router, "/");
    expect(await screen.findByText("Сім'ю видалено. Ваш холодильник тепер порожній.")).toBeVisible();
    expect(await screen.findByRole("heading", { name: "Холодильник порожній" })).toBeVisible();
  });
});

describe("family page — member (F-62)", () => {
  it("hides management and can only leave", async () => {
    mockAuthControl.signIn("maksym@example.com");
    const { user, router } = renderApp("/family");
    const table = await membersTable();
    await table.findByText("Олена Кравченко");

    expect(screen.queryByRole("heading", { name: "Запросити до сім'ї" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Видалити сім'ю" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Запросити члена сім'ї" })).not.toBeInTheDocument();
    expect(table.queryByRole("button", { name: "Дії з учасником Олена Кравченко" })).not.toBeInTheDocument();

    await user.click(table.getByRole("button", { name: "Дії з учасником Максим Кравченко" }));
    expect(screen.queryByRole("menuitem", { name: "Зробити власником" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Вийти із сім'ї" }));

    await waitForPath(router, "/");
    expect(await screen.findByText("Ви вийшли із сім'ї")).toBeVisible();
    expect(await api.household.get()).toMatchObject({ memberCount: 1, role: "OWNER" });
  });
});

describe("join (F-61)", () => {
  it("new user joins by code and lands in the family", async () => {
    mockAuthControl.signIn();
    await api.auth.register({ name: "Ірина Коваль", email: "ira@zwf.app", password: "Secret-pass-1" });
    const { user, router } = renderApp("/join");

    await user.type(await screen.findByLabelText("Код сім'ї"), "zwf-0000-aa");
    await user.click(screen.getByRole("button", { name: "Приєднатися" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Код або посилання недійсні чи прострочені.");

    await user.clear(screen.getByLabelText("Код сім'ї"));
    await user.type(screen.getByLabelText("Код сім'ї"), "zwf 4821 kr");
    await user.click(screen.getByRole("button", { name: "Приєднатися" }));

    await waitForPath(router, "/family");
    expect(await screen.findByText("Ласкаво просимо до «Сім'я Кравченко»!")).toBeVisible();
    expect(await (await membersTable()).findByText(/ira@zwf.app · Ви/)).toBeVisible();
  });

  it("invite link from the mail works after login and returns to the page", async () => {
    mockAuthControl.signIn();
    await api.household.invite("ira@zwf.app");
    const link = mockHouseholdControl.lastInviteLink()!;
    await api.auth.register({ name: "Ірина Коваль", email: "ira@zwf.app", password: "Secret-pass-1" });
    await api.auth.logout();

    const { user, router } = renderApp(link.replace("/lms", ""));
    await waitForPath(router, `/login?redirect=${encodeURIComponent(link.replace("/lms", ""))}`);
    await user.type(await screen.findByLabelText("Електронна пошта"), "ira@zwf.app");
    await user.type(screen.getByLabelText("Пароль"), "Secret-pass-1");
    await user.click(screen.getByRole("button", { name: "Увійти" }));

    await user.click(await screen.findByRole("button", { name: "Прийняти запрошення" }));
    await waitForPath(router, "/family");
    expect(await screen.findByText("Ласкаво просимо до «Сім'я Кравченко»!")).toBeVisible();
  });
});
