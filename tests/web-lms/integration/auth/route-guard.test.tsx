import { act, screen } from "@testing-library/react";
import * as client from "@zwf/api-client";
import { ApiError, DEMO_ACCOUNT, mockAuthControl } from "@zwf/api-client";
import { describe, expect, it, vi } from "vitest";
import { renderApp, waitForPath } from "../../support/render";

async function signIn(user: ReturnType<typeof renderApp>["user"], password: string = DEMO_ACCOUNT.password) {
  await user.type(await screen.findByLabelText("Електронна пошта"), DEMO_ACCOUNT.email);
  await user.type(screen.getByLabelText("Пароль"), password);
  await user.click(screen.getByRole("button", { name: "Увійти" }));
}

/** F-11: захист маршрутів кабінету і повернення після входу. */
describe("route guard", () => {
  it("anonymous visitor of the fridge is sent to login (no redirect param for the home page)", async () => {
    const { router } = renderApp("/");

    await waitForPath(router, "/login");
    expect(await screen.findByRole("heading", { name: "З поверненням!" })).toBeVisible();
  });

  it("deep link survives the login: back to the same page with its search params", async () => {
    const { router, user } = renderApp('/recipes?ids=["p2","p3"]');

    await waitForPath(router, `/login?redirect=${encodeURIComponent('/recipes?ids=%5B%22p2%22%2C%22p3%22%5D')}`);
    await signIn(user);

    await waitForPath(router, "/recipes?ids=%5B%22p2%22%2C%22p3%22%5D");
    expect(await screen.findByRole("heading", { name: "Розумні рецепти проти марнування їжі" })).toBeVisible();
    expect(screen.getByText("Обрано: 2 з 4")).toBeVisible();
    expect(document.title).toBe("Рецепти із залишків · Zero Waste Fridge");
  });

  it("redirect survives switching to the registration tab", async () => {
    const { router, user } = renderApp("/shopping");
    await waitForPath(router, "/login?redirect=%2Fshopping");

    await user.click(await screen.findByRole("tab", { name: "Реєстрація" }));
    await user.type(await screen.findByLabelText("Ім'я та прізвище"), "Максим Кравченко");
    await user.type(screen.getByLabelText("Електронна пошта"), "max@zwf.app");
    await user.type(screen.getByLabelText("Пароль"), "Secret-pass-1");
    await user.click(screen.getByRole("button", { name: "Створити акаунт" }));

    await waitForPath(router, "/shopping");
    expect(await screen.findByRole("heading", { name: "Розумний список покупок" })).toBeVisible();
  });

  it("ignores external redirect targets", async () => {
    const { router, user } = renderApp("/login?redirect=%2F%2Fevil.example%2Fsteal");

    await signIn(user);

    await waitForPath(router, "/");
  });

  it("signed-in user opening /login goes straight to the app (or to the redirect target)", async () => {
    const first = renderApp("/login", { signedIn: true });
    await waitForPath(first.router, "/");
    first.unmount();

    const second = renderApp("/login?redirect=%2Fshopping", { signedIn: true });
    await waitForPath(second.router, "/shopping");
  });

  it("session that expires mid-work leads to login and back to the same page", async () => {
    const { router, queryClient, user } = renderApp("/shopping", { signedIn: true });
    expect(await screen.findByRole("heading", { name: "Розумний список покупок" })).toBeVisible();
    expect(await screen.findByText("Шпинат Baby свіжий")).toBeVisible(); // дані завантажені — далі буде саме повторний запит

    mockAuthControl.expireSession();
    await act(() => queryClient.refetchQueries({ queryKey: client.queryKeys.shoppingList }));

    await waitForPath(router, "/login?redirect=%2Fshopping");
    expect(queryClient.getQueryData(client.queryKeys.me)).toBeUndefined();
    await signIn(user);
    await waitForPath(router, "/shopping");
  });

  it("server error while checking the session shows a retry screen instead of the login page", async () => {
    const me = vi.spyOn(client.api.auth, "me").mockRejectedValueOnce(new ApiError(503, "Service Unavailable"));
    mockAuthControl.signIn();
    const { user } = renderApp("/");

    expect(await screen.findByRole("alert")).toHaveTextContent("Щось пішло не так");
    await user.click(screen.getByRole("button", { name: "Спробувати ще" }));

    expect(await screen.findByRole("heading", { name: "Мій холодильник" })).toBeVisible();
    expect(me).toHaveBeenCalledTimes(2);
  });
});
