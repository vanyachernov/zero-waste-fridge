import { act, screen } from "@testing-library/react";
import * as client from "@zwf/api-client";
import { DEMO_ACCOUNT, mockAuthControl } from "@zwf/api-client";
import { describe, expect, it } from "vitest";
import { renderApp, waitForPath } from "../../support/render";

const NEW_PASSWORD = "Brand-new-pass-1";

function resetPath() {
  const link = mockAuthControl.lastResetLink();
  expect(link).toBeTruthy();
  return link!.replace(/^\/lms/, "");
}

async function requestLink(user: ReturnType<typeof renderApp>["user"], email: string = DEMO_ACCOUNT.email) {
  const input = await screen.findByLabelText("Електронна пошта");
  await user.clear(input);
  await user.type(input, email);
  await user.click(screen.getByRole("button", { name: "Надіслати посилання" }));
  return screen.findByRole("heading", { name: "Перевірте пошту" });
}

/** F-13: «Забули пароль?» → лист → новий пароль (мок-бекенд з тими ж правилами, що й B-06). */
describe("password recovery", () => {
  it("«Забули пароль?» from the login form carries the typed email", async () => {
    const { router, user } = renderApp("/login");

    await user.type(await screen.findByLabelText("Електронна пошта"), " olena@example.com ");
    await user.click(screen.getByRole("link", { name: "Забули пароль?" }));

    await waitForPath(router, "/forgot-password?email=olena%40example.com");
    expect(await screen.findByLabelText("Електронна пошта")).toHaveValue("olena@example.com");
    expect(document.title).toBe("Відновлення пароля · Zero Waste Fridge");
  });

  it("validates the email and shows the same confirmation for unknown accounts", async () => {
    const { user } = renderApp("/forgot-password");

    await user.click(await screen.findByRole("button", { name: "Надіслати посилання" }));
    expect(await screen.findByText("Обов'язкове поле")).toBeVisible();

    await requestLink(user, "nobody@zwf.app");
    expect(screen.getByText(/Якщо акаунт з адресою nobody@zwf.app існує/)).toBeVisible();
    expect(mockAuthControl.lastResetLink()).toBeNull();
  });

  it("resend is locked for a minute, matching the backend cooldown", async () => {
    const { user } = renderApp("/forgot-password");

    await requestLink(user);

    expect(screen.getByRole("button", { name: /Надіслати ще раз через (60|59) с/ })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Повернутися до входу" })).toBeVisible();
  });

  it("full flow: new password works, old one does not", async () => {
    const forgot = renderApp("/forgot-password");
    await requestLink(forgot.user);
    expect(screen.getByRole("link", { name: /Демо-режим: відкрити посилання/ })).toBeVisible();
    const path = resetPath();
    forgot.unmount();

    const { router, user } = renderApp(path);
    expect(await screen.findByRole("heading", { name: "Новий пароль" })).toBeVisible();

    await user.type(screen.getByLabelText("Новий пароль"), "short");
    await user.type(screen.getByLabelText("Повторіть пароль"), "other");
    await user.click(screen.getByRole("button", { name: "Зберегти пароль" }));
    expect(await screen.findByText("Мінімум 8 символів", { selector: "p" })).toBeVisible();
    expect(screen.getByText("Паролі не збігаються")).toBeVisible();

    await user.clear(screen.getByLabelText("Новий пароль"));
    await user.clear(screen.getByLabelText("Повторіть пароль"));
    await user.type(screen.getByLabelText("Новий пароль"), NEW_PASSWORD);
    await user.type(screen.getByLabelText("Повторіть пароль"), NEW_PASSWORD);
    await user.click(screen.getByRole("button", { name: "Зберегти пароль" }));

    expect(await screen.findByRole("heading", { name: "Пароль змінено" })).toBeVisible();
    await user.click(screen.getByRole("link", { name: "Увійти" }));
    await waitForPath(router, "/login");

    await expect(client.api.auth.login({ email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password, rememberMe: false })).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
    await user.type(await screen.findByLabelText("Електронна пошта"), DEMO_ACCOUNT.email);
    await user.type(screen.getByLabelText("Пароль"), NEW_PASSWORD);
    await user.click(screen.getByRole("button", { name: "Увійти" }));
    await waitForPath(router, "/");
  });

  it("used or unknown token: explains and offers a new link", async () => {
    const { router, user } = renderApp("/reset-password?token=mock-expired");

    await user.type(await screen.findByLabelText("Новий пароль"), NEW_PASSWORD);
    await user.type(screen.getByLabelText("Повторіть пароль"), NEW_PASSWORD);
    await user.click(screen.getByRole("button", { name: "Зберегти пароль" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Посилання недійсне або застаріло");
    await user.click(screen.getByRole("link", { name: "Запросити нове посилання" }));
    await waitForPath(router, "/forgot-password");
  });

  it("link without token shows an explanation instead of the form", async () => {
    renderApp("/reset-password");

    expect(await screen.findByRole("alert")).toHaveTextContent("У посиланні немає токена");
    expect(screen.queryByLabelText("Новий пароль")).not.toBeInTheDocument();
  });

  it("signed-in user who resets the password is signed out locally too", async () => {
    mockAuthControl.signIn();
    await client.api.auth.forgotPassword(DEMO_ACCOUNT.email);
    const { router, queryClient, user } = renderApp(resetPath());
    await act(() => queryClient.fetchQuery({ queryKey: client.queryKeys.me, queryFn: () => client.api.auth.me() }));

    await user.type(await screen.findByLabelText("Новий пароль"), NEW_PASSWORD);
    await user.type(screen.getByLabelText("Повторіть пароль"), NEW_PASSWORD);
    await user.click(screen.getByRole("button", { name: "Зберегти пароль" }));
    expect(await screen.findByRole("heading", { name: "Пароль змінено" })).toBeVisible();

    expect(queryClient.getQueryData(client.queryKeys.me)).toBeUndefined();
    await router.navigate({ to: "/" });
    await waitForPath(router, "/login");
  });
});
