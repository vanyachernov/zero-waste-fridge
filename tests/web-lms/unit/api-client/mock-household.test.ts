import { api, configureApi, DEMO_ACCOUNT, isApiError, mockAuthControl, mockHouseholdControl, normalizeJoinCode } from "@zwf/api-client";
import { beforeEach, describe, expect, it } from "vitest";

/** Мок сім'ї дзеркалить B-50…B-55. */
const codeOf = (p: Promise<unknown>) =>
  p.then(
    () => "ok",
    (e: unknown) => (isApiError(e) ? `${e.status} ${e.code ?? ""} ${JSON.stringify(e.fieldErrors)}`.trim() : String(e)),
  );

describe("mock household backend", () => {
  beforeEach(() => {
    configureApi({ mock: true });
    mockAuthControl.signIn();
  });

  it("owner sees the family, permissions and last activity", async () => {
    expect(await api.household.get()).toMatchObject({ name: "Сім'я Кравченко", memberCount: 3, role: "OWNER" });
    const members = await api.household.members();
    expect(members.map((m) => [m.name, m.role, m.me])).toEqual([
      ["Олена Кравченко", "OWNER", true],
      ["Максим Кравченко", "MEMBER", false],
      ["Софія Кравченко", "MEMBER", false],
    ]);
    expect(members[0]!.lastActivity).toMatchObject({ type: "PRODUCT_ADDED", subject: { name: "Молоко пастеризоване 2.5%" } });
    expect(members[2]!.lastActivity).toMatchObject({ type: "PRODUCT_WRITTEN_OFF", outcome: "EATEN" });
    expect((await api.household.invites()).map((i) => i.email)).toEqual(["andriy.k@gmail.com"]);
  });

  it("members cannot manage, the last owner stays", async () => {
    mockAuthControl.signIn("maksym@example.com");
    expect((await api.household.get()).permissions).not.toContain("MANAGE_MEMBERS");
    expect(await codeOf(api.household.invite("x@y.zz"))).toBe("403 FORBIDDEN {}");
    expect(await codeOf(api.household.changeRole("u3", "OWNER"))).toBe("403 FORBIDDEN {}");
    expect(await codeOf(api.household.removeMember("u3"))).toBe("403 FORBIDDEN {}");

    mockAuthControl.signIn();
    expect(await codeOf(api.household.changeRole("u1", "MEMBER"))).toBe("409 LAST_OWNER {}");
    expect(await codeOf(api.household.removeMember("u1"))).toBe("409 LAST_OWNER {}");
    await api.household.changeRole("u2", "OWNER");
    expect((await api.household.changeRole("u1", "MEMBER")).role).toBe("MEMBER");
  });

  it("invites by email: validation, duplicates and joining by link", async () => {
    expect(await codeOf(api.household.invite("bad"))).toBe('400 VALIDATION_FAILED {"email":"Email"}');
    expect(await codeOf(api.household.invite("maksym@example.com"))).toBe('409 ALREADY_MEMBER {"email":"ALREADY_MEMBER"}');
    await api.household.invite("Max@ZWF.app", "OWNER");
    expect(await codeOf(api.household.invite("max@zwf.app"))).toBe('409 INVITE_EXISTS {"email":"INVITE_EXISTS"}');
    const token = mockHouseholdControl.lastInviteLink()!.split("invite=")[1]!;

    await api.auth.register({ name: "Іра", email: "ira@zwf.app", password: "Secret-pass-1" });
    expect(await codeOf(api.household.join({ invite: token }))).toBe("403 INVITE_EMAIL_MISMATCH {}");

    await api.auth.register({ name: "Макс Новий", email: "max@zwf.app", password: "Secret-pass-1" });
    await api.products.create({ name: "Мій сир", category: "dairy", quantity: 1, unit: "pcs", expiresAt: "2099-01-01" });
    const joined = await api.household.join({ invite: token });
    expect(joined).toMatchObject({ householdName: "Сім'я Кравченко", role: "OWNER" });
    expect((await api.products.list({ q: "мій сир" })).total).toBe(1);
    expect(await codeOf(api.household.join({ invite: token }))).toBe("400 INVALID_INVITE {}");
  });

  it("family code: normalize, regenerate, join and LAST_OWNER", async () => {
    expect(normalizeJoinCode(" zwf 4821 kr ")).toBe("ZWF-4821-KR");
    expect(normalizeJoinCode("4821KR")).toBe("ZWF-4821-KR");
    expect(normalizeJoinCode("nope")).toBeNull();
    expect((await api.household.code()).code).toBe("ZWF-4821-KR");
    const fresh = await api.household.regenerateCode();
    expect(fresh.code).toMatch(/^ZWF-[A-Z2-9]{4}-[A-Z2-9]{2}$/);

    await api.auth.register({ name: "Іра", email: "ira@zwf.app", password: "Secret-pass-1" });
    expect(await codeOf(api.household.join({ code: "ZWF-4821-KR" }))).toBe("400 INVALID_INVITE {}");
    expect(await codeOf(api.household.join({} as never))).toBe('400 VALIDATION_FAILED {"code":"NotBlank"}');
    expect(await api.household.join({ code: fresh.code!.toLowerCase() })).toMatchObject({ householdId: "h1", role: "MEMBER" });

    // Єдиний власник сім'ї з іншими учасниками не може піти в іншу
    mockAuthControl.signIn(DEMO_ACCOUNT.email);
    expect(await codeOf(api.household.join({ code: fresh.code! }))).toBe("409 ALREADY_MEMBER {}");
    await api.auth.register({ name: "Сусід", email: "n@zwf.app", password: "Secret-pass-1" });
    const neighbourCode = (await api.household.regenerateCode()).code!;
    mockAuthControl.signIn(DEMO_ACCOUNT.email);
    expect(await codeOf(api.household.join({ code: neighbourCode }))).toBe("409 LAST_OWNER {}");
  });

  it("deleting the household needs the password and frees every member", async () => {
    expect(await codeOf(api.household.remove("wrong"))).toBe('400 VALIDATION_FAILED {"password":"INVALID_PASSWORD"}');
    const me = await api.household.remove(DEMO_ACCOUNT.password);
    expect(me.householdId).not.toBe("h1");
    expect((await api.products.list()).total).toBe(0);
    expect((await api.household.members()).map((m) => m.name)).toEqual(["Олена Кравченко"]);
    mockAuthControl.signIn("maksym@example.com");
    expect(await api.household.get()).toMatchObject({ role: "OWNER", memberCount: 1 });
  });
});
