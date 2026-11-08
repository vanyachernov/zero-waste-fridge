import { ApiError } from "@zwf/api-client";
import { createTranslator } from "@zwf/i18n";
import { describe, expect, it } from "vitest";
import { errorMessage, fieldMessage, serverFieldErrors } from "@lms/lib/errors";

const i18n = createTranslator("uk");

describe("errorMessage", () => {
  it("translates backend codes", () => {
    expect(errorMessage(new ApiError(401, "x", { code: "INVALID_CREDENTIALS" }), i18n)).toBe("Неправильний email або пароль");
    expect(errorMessage(new ApiError(400, "x", { code: "INVALID_RESET_TOKEN" }), i18n)).toMatch(/Посилання недійсне/);
  });

  it("falls back to a generic text for unknown codes and 5xx", () => {
    expect(errorMessage(new ApiError(418, "x", { code: "TEAPOT" }), i18n)).toBe(i18n.messages.errors.UNKNOWN);
    expect(errorMessage(new ApiError(500, "boom"), i18n)).toBe(i18n.messages.errors.UNKNOWN);
  });

  it("recognises network failures (fetch throws TypeError)", () => {
    expect(errorMessage(new TypeError("Failed to fetch"), i18n)).toBe(i18n.messages.errors.NETWORK);
  });
});

describe("fieldMessage", () => {
  it.each([
    ["NotBlank", "Обов'язкове поле"],
    ["Email", "Невірний формат email"],
    ["TOO_SHORT", "Мінімум 8 символів"],
    ["EMAIL_TAKEN", "Цей email уже зареєстровано"],
    ["MISMATCH", "Паролі не збігаються"],
  ])("%s", (code, text) => expect(fieldMessage(code, i18n)).toBe(text));

  it("unknown code → generic, empty → undefined", () => {
    expect(fieldMessage("Pattern", i18n)).toBe("Невірне значення");
    expect(fieldMessage(null, i18n)).toBeUndefined();
  });
});

describe("serverFieldErrors", () => {
  it("keeps only the form's own fields", () => {
    const error = new ApiError(400, "x", { fieldErrors: { email: "Email", password: "TOO_SHORT", other: "X" } });
    expect(serverFieldErrors(error, ["email", "password"] as const)).toEqual({ email: "Email", password: "TOO_SHORT" });
  });

  it("returns empty for non-API errors", () => {
    expect(serverFieldErrors(new Error("x"), ["email"] as const)).toEqual({});
  });
});
