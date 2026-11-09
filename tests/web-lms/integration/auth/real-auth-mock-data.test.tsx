import { act, screen } from "@testing-library/react";
import { parseMockMode } from "@zwf/api-client";
import { describe, expect, it } from "vitest";
import { BACKEND_PASSWORD, BACKEND_USER, installFakeAuthBackend } from "../../support/fake-auth-backend";
import { renderApp, waitForPath } from "../../support/render";

/**
 * I-01, режим `VITE_API_MOCK=data` (`pnpm --filter @zwf/web-lms dev:backend`):
 * вхід і сесія — через справжні HTTP-ендпоінти B-02…B-06, а холодильник — на моках (B-11 ще немає).
 */
describe("real auth + mocked data", () => {
  it("signs in against the backend with CSRF and shows mocked fridge data", async () => {
    const backend = installFakeAuthBackend();
    const { router, user } = renderApp("/", { mock: parseMockMode("data") });

    await waitForPath(router, "/login");
    expect(screen.queryByRole("button", { name: /Демо-акаунт/ })).not.toBeInTheDocument();

    await user.type(await screen.findByLabelText("Електронна пошта"), BACKEND_USER.email);
    await user.type(screen.getByLabelText("Пароль"), BACKEND_PASSWORD);
    await user.click(screen.getByRole("button", { name: "Увійти" }));

    await waitForPath(router, "/");
    // Дані з моку: у «зовнішнього» домогосподарства (справжній користувач) холодильник спершу порожній
    expect(await screen.findByRole("heading", { name: "Холодильник порожній" })).toBeVisible();
    expect(screen.getAllByText(BACKEND_USER.name).length).toBeGreaterThan(0);

    const calls = backend.calls();
    expect(calls).toContain("GET /api/auth/csrf");
    expect(calls.indexOf("GET /api/auth/csrf")).toBeLessThan(calls.indexOf("POST /api/auth/login"));
    expect(calls.some((c) => c.includes("/api/products"))).toBe(false);
  });

  it("wrong password shows the server error from ProblemDetail code", async () => {
    installFakeAuthBackend();
    const { router, user } = renderApp("/login", { mock: parseMockMode("data") });

    await user.type(await screen.findByLabelText("Електронна пошта"), BACKEND_USER.email);
    await user.type(screen.getByLabelText("Пароль"), "Wrong-pass-1");
    await user.click(screen.getByRole("button", { name: "Увійти" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/пароль/i);
    expect(router.state.location.href).toBe("/login");
  });

  it("server-side session end sends the user to login and keeps the page to return to", async () => {
    const backend = installFakeAuthBackend();
    const { router, user, queryClient } = renderApp("/shopping", { mock: parseMockMode("data") });

    await waitForPath(router, "/login?redirect=%2Fshopping");
    await user.type(await screen.findByLabelText("Електронна пошта"), BACKEND_USER.email);
    await user.type(screen.getByLabelText("Пароль"), BACKEND_PASSWORD);
    await user.click(screen.getByRole("button", { name: "Увійти" }));
    await waitForPath(router, "/shopping");

    backend.expireSession();
    await act(async () => {
      queryClient.clear();
      await router.navigate({ to: "/recipes" });
    });

    await waitForPath(router, "/login?redirect=%2Frecipes");
  });
});
