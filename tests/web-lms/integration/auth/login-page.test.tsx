import { screen, within } from "@testing-library/react";
import { DEMO_ACCOUNT } from "@zwf/api-client";
import { describe, expect, it } from "vitest";
import { renderApp, waitForPath } from "../../support/render";

/** F-10: сторінка «Вхід / Реєстрація» у складі всього SPA (роутер + Query + мок-бекенд). */
describe("login page", () => {
  it("renders the mockup: benefits panel, tabs, login form, join-by-code block", async () => {
    renderApp("/login");

    expect(await screen.findByRole("heading", { name: "З поверненням!" })).toBeVisible();
    expect(screen.getByRole("heading", { name: /Менше викинутої їжі/ })).toBeInTheDocument();
    expect(screen.getByText("Рецепт із 3–4 продуктів за кілька кліків")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Вхід" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Приєднатися до сім'ї за кодом" })).toBeVisible();
    expect(screen.getByText(/Введіть код із листа/)).toBeVisible();
    expect(document.title).toBe("Вхід · Zero Waste Fridge");
  });

  it("switching tabs is reflected in the URL and back", async () => {
    const { user, router } = renderApp("/login");

    await user.click(await screen.findByRole("tab", { name: "Реєстрація" }));

    await waitForPath(router, "/login?tab=register");
    expect(screen.getByRole("heading", { name: "Створіть акаунт" })).toBeVisible();
    expect(screen.getByRole("tabpanel")).toHaveAttribute("id", "auth-panel-register");
    expect(document.title).toBe("Реєстрація · Zero Waste Fridge");

    await user.click(screen.getByRole("tab", { name: "Вхід" }));
    await waitForPath(router, "/login");
  });

  it("deep link to the register tab", async () => {
    renderApp("/login?tab=register");
    expect(await screen.findByRole("button", { name: "Створити акаунт" })).toBeVisible();
  });

  it("join-by-code explains it is coming soon", async () => {
    const { user } = renderApp("/login");

    await user.click(await screen.findByRole("button", { name: "Приєднатися до сім'ї за кодом" }));

    expect(screen.getByRole("status")).toHaveTextContent("з'явиться найближчим часом");
  });

  it("login opens the fridge with the user's name in the header", async () => {
    const { user, router } = renderApp("/login");

    await user.type(await screen.findByLabelText("Електронна пошта"), DEMO_ACCOUNT.email);
    await user.type(screen.getByLabelText("Пароль"), DEMO_ACCOUNT.password);
    await user.click(screen.getByRole("button", { name: "Увійти" }));

    await waitForPath(router, "/");
    expect(await screen.findByRole("heading", { name: "Мій холодильник" })).toBeVisible();
    expect(within(screen.getByRole("banner")).getByText("Олена Кравченко")).toBeInTheDocument();
  });

  it("registration creates the account and opens the fridge", async () => {
    const { user, router } = renderApp("/login?tab=register");

    await user.type(await screen.findByLabelText("Ім'я та прізвище"), "Максим Кравченко");
    await user.type(screen.getByLabelText("Електронна пошта"), "max@zwf.app");
    await user.type(screen.getByLabelText("Пароль"), "Secret-pass-1");
    await user.click(screen.getByRole("button", { name: "Створити акаунт" }));

    await waitForPath(router, "/");
    expect(await screen.findByRole("heading", { name: "Мій холодильник" })).toBeVisible();
    expect(within(screen.getByRole("banner")).getByText("Максим Кравченко")).toBeInTheDocument();
  });
});
