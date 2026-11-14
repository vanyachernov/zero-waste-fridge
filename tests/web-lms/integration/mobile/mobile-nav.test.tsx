import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp, waitForPath } from "../../support/render";

/** F-81: мобільна навігація за макетом. */
describe("mobile shell (F-81)", () => {
  it("bottom navigation has Fridge, Recipes, Shopping and Family; stats moved to the profile menu", async () => {
    const { router, user } = renderApp("/", { signedIn: true });
    const mobile = await screen.findByRole("navigation", { name: "Mobile" });

    expect(within(mobile).getAllByRole("link").map((a) => a.textContent)).toEqual(["Холодильник", "Рецепти", "Покупки", "Сім'я"]);
    expect(within(mobile).getByRole("link", { name: "Холодильник" })).toHaveAttribute("aria-current", "page");

    await user.click(within(mobile).getByRole("link", { name: "Сім'я" }));
    await waitForPath(router, "/family");
    await waitFor(() => expect(within(mobile).getByRole("link", { name: "Сім'я" })).toHaveAttribute("aria-current", "page"));

    await user.click(within(screen.getByRole("banner")).getByRole("button", { name: "Меню профілю" }));
    await user.click(screen.getByRole("menuitem", { name: /Статистика & Екологія/ }));
    await waitForPath(router, "/stats");
  });
});
