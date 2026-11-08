import { screen, waitFor } from "@testing-library/react";
import { configureApi, DEMO_ACCOUNT } from "@zwf/api-client";
import * as client from "@zwf/api-client";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "@lms/auth/LoginForm";
import { renderWithProviders } from "../../support/render";

describe("LoginForm", () => {
  it("validates on the client before calling the API", async () => {
    const login = vi.spyOn(client.api.auth, "login");
    const { user } = renderWithProviders(<LoginForm onSuccess={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Увійти" }));

    expect(await screen.findByText("Обов'язкове поле", { selector: "#login-email-message" })).toBeVisible();
    expect(screen.getByLabelText("Електронна пошта")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Електронна пошта")).toHaveAccessibleDescription("Обов'язкове поле");
    expect(login).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Електронна пошта"), "olena@");
    await user.click(screen.getByRole("button", { name: "Увійти" }));
    expect(await screen.findByText("Невірний формат email")).toBeVisible();
  });

  it("toggles password visibility", async () => {
    const { user } = renderWithProviders(<LoginForm onSuccess={vi.fn()} />);
    const password = screen.getByLabelText("Пароль");
    expect(password).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Показати пароль" }));

    expect(password).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Сховати пароль" })).toHaveAttribute("aria-pressed", "true");
  });

  it("submits trimmed email, password and remember flag (checked by default, as in the mockup)", async () => {
    const onSuccess = vi.fn();
    const login = vi.spyOn(client.api.auth, "login");
    const { user } = renderWithProviders(<LoginForm onSuccess={onSuccess} />);

    expect(screen.getByRole("checkbox", { name: "Запам'ятати мене" })).toBeChecked();
    await user.type(screen.getByLabelText("Електронна пошта"), `  ${DEMO_ACCOUNT.email} `);
    await user.type(screen.getByLabelText("Пароль"), DEMO_ACCOUNT.password);
    await user.click(screen.getByRole("checkbox", { name: "Запам'ятати мене" }));
    await user.click(screen.getByRole("button", { name: "Увійти" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onSuccess.mock.calls[0]![0]).toMatchObject({ email: DEMO_ACCOUNT.email });
    expect(login).toHaveBeenCalledWith({ email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password, rememberMe: false }, expect.anything());
  });

  it("shows translated server error for wrong credentials and marks fields invalid", async () => {
    const { user } = renderWithProviders(<LoginForm onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText("Електронна пошта"), DEMO_ACCOUNT.email);
    await user.type(screen.getByLabelText("Пароль"), "Wrong-pass-1");
    await user.click(screen.getByRole("button", { name: "Увійти" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Неправильний email або пароль");
    expect(screen.getByLabelText("Пароль")).toHaveAttribute("aria-invalid", "true");
  });

  it("network failure shows a connection message", async () => {
    configureApi({ mock: false });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const { user } = renderWithProviders(<LoginForm onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText("Електронна пошта"), DEMO_ACCOUNT.email);
    await user.type(screen.getByLabelText("Пароль"), DEMO_ACCOUNT.password);
    await user.click(screen.getByRole("button", { name: "Увійти" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Немає з'єднання з сервером");
    vi.unstubAllGlobals();
  });

  it("demo hint fills the form in mock mode", async () => {
    const { user } = renderWithProviders(<LoginForm onSuccess={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /Демо-режим/ }));

    expect(screen.getByLabelText("Електронна пошта")).toHaveValue(DEMO_ACCOUNT.email);
    expect(screen.getByLabelText("Пароль")).toHaveValue(DEMO_ACCOUNT.password);
  });
});
