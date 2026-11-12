import { act, screen, within } from "@testing-library/react";
import { onlineManager } from "@tanstack/react-query";
import { api } from "@zwf/api-client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderApp, waitForPath } from "../../support/render";

/** F-92: 404, помилка в розділі й офлайн. */
describe("error handling (F-92)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    onlineManager.setOnline(true);
  });

  it("unknown address shows 404 with a way back", async () => {
    const { router, user } = renderApp("/no-such-page", { signedIn: true });

    expect(await screen.findByRole("heading", { name: "Сторінку не знайдено" })).toBeVisible();
    await user.click(screen.getByRole("link", { name: "До холодильника" }));
    await waitForPath(router, "/");
    expect(await screen.findByRole("heading", { name: "Мій холодильник" })).toBeVisible();
  });

  it("a failing section keeps the shell and can be retried", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {}); // роутер логує впалий loader
    // Мережеву помилку React Query повторює один раз — падають обидві спроби
    const list = vi.spyOn(api.products, "list").mockRejectedValueOnce(new Error("boom")).mockRejectedValueOnce(new Error("boom"));
    const { user } = renderApp("/recipes", { signedIn: true });

    const alert = await screen.findByRole("alert", {}, { timeout: 4000 });
    expect(within(alert).getByRole("heading", { name: "Щось пішло не так" })).toBeVisible();
    // Шапка й навігація на місці — впав лише розділ
    expect(screen.getByRole("navigation", { name: "Mobile" })).toBeInTheDocument();
    expect(within(screen.getByRole("banner")).getByRole("button", { name: "Меню профілю" })).toBeInTheDocument();

    await user.click(within(alert).getByRole("button", { name: "Спробувати ще" }));
    expect(await screen.findByRole("heading", { level: 1, name: /Розумні рецепти/ })).toBeVisible();
    expect(list).toHaveBeenCalledTimes(3);
  });

  it("offline banner appears without network and confirms when it is back", async () => {
    renderApp("/", { signedIn: true });
    await screen.findByRole("heading", { name: "Мій холодильник" });
    expect(screen.queryByText(/Немає з'єднання/)).not.toBeInTheDocument();

    act(() => onlineManager.setOnline(false));
    expect(screen.getByRole("status", { name: "" })).toHaveTextContent("Немає з'єднання з інтернетом");

    act(() => onlineManager.setOnline(true));
    expect(screen.getByText("З'єднання відновлено")).toBeVisible();
  });
});
