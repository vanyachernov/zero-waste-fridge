import { describe, expect, it } from "vitest";
import {
  hasErrors,
  validateEmail,
  validateLoginPassword,
  validateName,
  validateNewPassword,
  validatePasswordConfirmation,
} from "@lms/auth/validation";

describe("validateEmail", () => {
  it.each([
    ["", "NotBlank"],
    ["   ", "NotBlank"],
    ["olena", "Email"],
    ["olena@", "Email"],
    ["olena@example", "Email"],
    ["o lena@example.com", "Email"],
    [`${"a".repeat(250)}@b.cd`, "Email"],
  ])("%j → %s", (value, code) => expect(validateEmail(value)).toBe(code));

  it("accepts valid email with surrounding spaces (backend strips them)", () => {
    expect(validateEmail("  olena@example.com ")).toBeNull();
  });
});

describe("validateNewPassword — mirrors backend PasswordPolicy", () => {
  it("requires a value", () => {
    expect(validateNewPassword("")).toBe("REQUIRED");
    expect(validateNewPassword("    ")).toBe("REQUIRED");
  });

  it("needs at least 8 characters, counted as code points", () => {
    expect(validateNewPassword("1234567")).toBe("TOO_SHORT");
    expect(validateNewPassword("🍎🥕🧀🥛")).toBe("TOO_SHORT");
    expect(validateNewPassword("12345678")).toBeNull();
  });

  it("allows at most 72 UTF-8 bytes (BCrypt limit)", () => {
    expect(validateNewPassword("a".repeat(72))).toBeNull();
    expect(validateNewPassword("a".repeat(73))).toBe("TOO_LONG");
    expect(validateNewPassword("ж".repeat(37))).toBe("TOO_LONG");
  });
});

describe("other validators", () => {
  it("login password only needs to be present", () => {
    expect(validateLoginPassword("")).toBe("NotBlank");
    expect(validateLoginPassword("short")).toBeNull();
  });

  it("name is required and at most 80 chars", () => {
    expect(validateName(" ")).toBe("NotBlank");
    expect(validateName("я".repeat(81))).toBe("Size");
    expect(validateName("Олена Кравченко")).toBeNull();
  });

  it("confirmation must match", () => {
    expect(validatePasswordConfirmation("Secret-pass-1", "")).toBe("REQUIRED");
    expect(validatePasswordConfirmation("Secret-pass-1", "Secret-pass-2")).toBe("MISMATCH");
    expect(validatePasswordConfirmation("Secret-pass-1", "Secret-pass-1")).toBeNull();
  });

  it("hasErrors ignores null/undefined", () => {
    expect(hasErrors({ a: null, b: undefined })).toBe(false);
    expect(hasErrors({ a: null, b: "Email" })).toBe(true);
  });
});
