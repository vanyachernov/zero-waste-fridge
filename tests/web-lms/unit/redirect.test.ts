import { describe, expect, it } from "vitest";
import { isPublicPath, safeRedirect } from "@lms/lib/redirect";

describe("safeRedirect — only internal SPA paths (open-redirect protection)", () => {
  it.each([
    ["/recipes", "/recipes"],
    ['/recipes?ids=["p1","p2"]', '/recipes?ids=["p1","p2"]'],
    ["/shopping#list", "/shopping#list"],
  ])("keeps %s", (value, expected) => expect(safeRedirect(value)).toBe(expected));

  it.each([
    "https://evil.example",
    "//evil.example/path",
    "/\\evil.example",
    "javascript:alert(1)",
    "recipes",
    "",
    "/recipes\n",
    "/login",
    "/login?redirect=/x",
    "/forgot-password",
    "/reset-password?token=abc",
  ])("rejects %j → /", (value) => expect(safeRedirect(value)).toBe("/"));

  it("rejects non-strings", () => {
    expect(safeRedirect(undefined)).toBe("/");
    expect(safeRedirect(["/recipes"])).toBe("/");
  });
});

describe("isPublicPath", () => {
  it("knows auth pages", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/reset-password")).toBe(true);
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/loginx")).toBe(false);
  });
});
