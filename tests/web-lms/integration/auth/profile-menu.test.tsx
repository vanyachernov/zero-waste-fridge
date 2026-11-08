import { screen, within } from "@testing-library/react";
import * as client from "@zwf/api-client";
import { describe, expect, it } from "vitest";
import { renderApp, waitForPath } from "../../support/render";

/** F-12: меню профілю в живому застосунку. */
describe("profile menu", () => {
  it("logout ends the session, clears cached data and keeps the app locked", async () => {
    const { router, queryClient, user } = renderApp("/", { signedIn: true });
    expect(await screen.findByRole("heading", { name: "Мій холодильник" })).toBeVisible();

    await user.click(within(screen.getByRole("banner")).getByRole("button", { name: "Меню профілю" }));
    await user.click(screen.getByRole("menuitem", { name: "Вийти" }));

    await waitForPath(router, "/login");
    expect(queryClient.getQueryData(client.queryKeys.products)).toBeUndefined();
    await expect(client.api.auth.me()).rejects.toMatchObject({ status: 401 });

    await router.navigate({ to: "/" });
    await waitForPath(router, "/login");
  });

  it("theme choice survives a reload", async () => {
    const first = renderApp("/", { signedIn: true });
    await first.user.click(await within(await screen.findByRole("banner")).findByRole("button", { name: "Меню профілю" }));
    await first.user.click(screen.getByRole("menuitemradio", { name: "Темна" }));
    expect(document.documentElement).toHaveClass("dark");
    first.unmount();
    document.documentElement.classList.remove("dark");

    const second = renderApp("/", { signedIn: true });
    await second.user.click(await within(await screen.findByRole("banner")).findByRole("button", { name: "Меню профілю" }));

    expect(screen.getByRole("menuitemradio", { name: "Темна" })).toHaveAttribute("aria-checked", "true");
    expect(document.documentElement).toHaveClass("dark");
  });
});
