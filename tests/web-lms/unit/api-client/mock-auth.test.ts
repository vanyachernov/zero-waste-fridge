import { api, configureApi, DEMO_ACCOUNT, isApiError, mockAuthControl } from "@zwf/api-client";
import { beforeEach, describe, expect, it } from "vitest";

/** Мок-бекенд має поводитися як справжній (B-02…B-06), інакше UI, протестований на моках, зламається на проді. */
describe("mock auth backend", () => {
  beforeEach(() => configureApi({ mock: true }));

  const codeOf = (promise: Promise<unknown>) => promise.then(() => "ok", (e: unknown) => (isApiError(e) ? `${e.status} ${e.code ?? ""}`.trim() : "?"));

  it("me() is 401 without session", async () => {
    expect(await codeOf(api.auth.me())).toBe("401");
  });

  it("login with demo account opens a session; wrong password and unknown email look the same", async () => {
    expect(await codeOf(api.auth.login({ email: DEMO_ACCOUNT.email, password: "nope-nope", rememberMe: false }))).toBe("401 INVALID_CREDENTIALS");
    expect(await codeOf(api.auth.login({ email: "x@y.zz", password: "nope-nope", rememberMe: false }))).toBe("401 INVALID_CREDENTIALS");

    const user = await api.auth.login({ email: " OLENA@example.com", password: DEMO_ACCOUNT.password, rememberMe: true });

    expect(user).toMatchObject({ email: DEMO_ACCOUNT.email, role: "OWNER", householdName: "Сім'я Кравченко" });
    await expect(api.auth.me()).resolves.toMatchObject({ email: DEMO_ACCOUNT.email });
  });

  it("register validates like the backend and signs in", async () => {
    expect(await codeOf(api.auth.register({ name: " ", email: "bad", password: "Secret-pass-1" }))).toBe("400 VALIDATION_FAILED");
    expect(await codeOf(api.auth.register({ name: "Макс", email: "max@zwf.app", password: "short" }))).toBe("400 PASSWORD_POLICY");
    expect(await codeOf(api.auth.register({ name: "Макс", email: "OLENA@example.com", password: "Secret-pass-1" }))).toBe("409 EMAIL_TAKEN");

    const user = await api.auth.register({ name: " Максим   Кравченко ", email: "Max@ZWF.app", password: "Secret-pass-1" });

    expect(user).toMatchObject({ name: "Максим Кравченко", email: "max@zwf.app", householdName: "Сім'я Кравченко", role: "OWNER" });
    await expect(api.auth.me()).resolves.toMatchObject({ email: "max@zwf.app" });
  });

  it("logout ends the session", async () => {
    mockAuthControl.signIn();
    await api.auth.logout();
    expect(await codeOf(api.auth.me())).toBe("401");
  });

  it("forgot/reset: single-use link, sessions end, new password works", async () => {
    await api.auth.forgotPassword("nobody@zwf.app");
    expect(mockAuthControl.lastResetLink()).toBeNull();

    mockAuthControl.signIn();
    await api.auth.forgotPassword(DEMO_ACCOUNT.email);
    const token = new URL(mockAuthControl.lastResetLink()!, "http://x").searchParams.get("token")!;

    expect(await codeOf(api.auth.resetPassword({ token, password: "short" }))).toBe("400 PASSWORD_POLICY");
    await api.auth.resetPassword({ token, password: "Brand-new-pass-1" });
    expect(await codeOf(api.auth.me())).toBe("401");
    expect(await codeOf(api.auth.resetPassword({ token, password: "Brand-new-pass-1" }))).toBe("400 INVALID_RESET_TOKEN");
    expect(await codeOf(api.auth.login({ email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password, rememberMe: false }))).toBe("401 INVALID_CREDENTIALS");
    expect(await codeOf(api.auth.login({ email: DEMO_ACCOUNT.email, password: "Brand-new-pass-1", rememberMe: false }))).toBe("ok");
  });

  it("session survives a page reload via localStorage (dev convenience)", async () => {
    await api.auth.login({ email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password, rememberMe: true });
    expect(localStorage.getItem("zwf.mock.session")).toBe(DEMO_ACCOUNT.email);
  });
});
