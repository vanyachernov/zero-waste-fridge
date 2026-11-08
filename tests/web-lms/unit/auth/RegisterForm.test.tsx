import { screen, waitFor } from "@testing-library/react";
import * as client from "@zwf/api-client";
import { describe, expect, it, vi } from "vitest";
import { RegisterForm } from "@lms/auth/RegisterForm";
import { renderWithProviders } from "../../support/render";

describe("RegisterForm", () => {
  it("shows all client-side errors at once and does not call the API", async () => {
    const register = vi.spyOn(client.api.auth, "register");
    const { user } = renderWithProviders(<RegisterForm onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText("Електронна пошта"), "not-an-email");
    await user.type(screen.getByLabelText("Пароль"), "1234567");
    await user.click(screen.getByRole("button", { name: "Створити акаунт" }));

    expect(await screen.findByText("Обов'язкове поле")).toBeVisible();
    expect(screen.getByText("Невірний формат email")).toBeVisible();
    expect(screen.getByText("Мінімум 8 символів", { selector: "p" })).toBeVisible();
    expect(register).not.toHaveBeenCalled();
  });

  it("password hint is the accessible description until there is an error", () => {
    renderWithProviders(<RegisterForm onSuccess={vi.fn()} />);
    expect(screen.getByLabelText("Пароль")).toHaveAccessibleDescription("Мінімум 8 символів");
  });

  it("maps EMAIL_TAKEN from the server to the email field", async () => {
    const { user } = renderWithProviders(<RegisterForm onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText("Ім'я та прізвище"), "Друга Олена");
    await user.type(screen.getByLabelText("Електронна пошта"), client.DEMO_ACCOUNT.email);
    await user.type(screen.getByLabelText("Пароль"), "Secret-pass-1");
    await user.click(screen.getByRole("button", { name: "Створити акаунт" }));

    expect(await screen.findByText("Цей email уже зареєстровано")).toBeVisible();
    expect(screen.getByLabelText("Електронна пошта")).toHaveAttribute("aria-invalid", "true");
  });

  it("registers with remember-me and reports the new user", async () => {
    const onSuccess = vi.fn();
    const register = vi.spyOn(client.api.auth, "register");
    const { user } = renderWithProviders(<RegisterForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText("Ім'я та прізвище"), "  Максим Кравченко ");
    await user.type(screen.getByLabelText("Електронна пошта"), "max@zwf.app");
    await user.type(screen.getByLabelText("Пароль"), "Secret-pass-1");
    await user.click(screen.getByRole("button", { name: "Створити акаунт" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onSuccess.mock.calls[0]![0]).toMatchObject({ name: "Максим Кравченко", role: "OWNER" });
    expect(register).toHaveBeenCalledWith(
      { name: "Максим Кравченко", email: "max@zwf.app", password: "Secret-pass-1", rememberMe: true },
      expect.anything(),
    );
  });
});
