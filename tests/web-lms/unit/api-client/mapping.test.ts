import { api, configureApi, toQueryString } from "@zwf/api-client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Q-02: фасад `api.*` у реальному режимі б'є в ті самі ендпоінти, що описані в README → API.
 * Якщо тут щось розійдеться з контролерами Spring, UI на моках пройде, а на бекенді зламається.
 */
describe("api facade → HTTP", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    fetchMock.mockImplementation(async () => new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } }));
    document.cookie = "XSRF-TOKEN=t; path=/";
    configureApi({ baseUrl: "/api", mock: false });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    configureApi({ mock: true });
  });

  const CASES: [string, () => Promise<unknown>, string, string, unknown?][] = [
    ["auth.me", () => api.auth.me(), "GET", "/api/auth/me"],
    ["auth.setTheme", () => api.auth.setTheme("dark"), "PUT", "/api/me/theme", { theme: "dark" }],
    ["products.list", () => api.products.list({ q: "сир", freshness: ["soon", "expired"], page: 2 }), "GET", "/api/products?q=%D1%81%D0%B8%D1%80&freshness=soon&freshness=expired&page=2"],
    ["products.update", () => api.products.update("p1", { openedAt: "2026-11-12" }), "PATCH", "/api/products/p1", { openedAt: "2026-11-12" }],
    ["products.writeOff", () => api.products.writeOff("p1", { reason: "EATEN" } as never), "POST", "/api/products/p1/write-off", { reason: "EATEN" }],
    ["shoppingList.get", () => api.shoppingList.get({ store: "АТБ", fromFridge: true }), "GET", "/api/shopping-list?store=%D0%90%D0%A2%D0%91&fromFridge=true"],
    ["shoppingList.toggle", () => api.shoppingList.toggle("s1"), "POST", "/api/shopping-list/s1/toggle"],
    ["shoppingList.clearBought", () => api.shoppingList.clearBought(), "DELETE", "/api/shopping-list/bought"],
    ["household.changeRole", () => api.household.changeRole("u2", "OWNER"), "PATCH", "/api/household/members/u2", { role: "OWNER" }],
    ["household.activity", () => api.household.activity({ limit: 10 }), "GET", "/api/household/activity?limit=10"],
    ["notifications.saveSettings", () => api.notifications.saveSettings({ inApp: true, emailDigest: true, push: false, digestTime: "20:31", quietHours: null }), "PUT", "/api/me/notification-settings", { inApp: true, emailDigest: true, push: false, digestTime: "20:31", quietHours: null }],
    ["notifications.readAll", () => api.notifications.readAll(), "POST", "/api/notifications/read-all"],
  ];

  it.each(CASES)("%s", async (_, call, method, url, body) => {
    await call();
    const [calledUrl, init] = fetchMock.mock.calls.at(-1)!;
    expect(calledUrl).toBe(url);
    expect((init?.method ?? "GET").toUpperCase()).toBe(method);
    if (body === undefined) expect(init?.body ?? undefined).toBeUndefined();
    else expect(JSON.parse(String(init?.body))).toEqual(body);
  });
});

describe("toQueryString", () => {
  it("skips empty values, repeats arrays and encodes", () => {
    expect(toQueryString({})).toBe("");
    expect(toQueryString({ a: undefined, b: null, c: "" })).toBe("");
    expect(toQueryString({ q: "a b&c", n: 0, tags: ["x", "y"] })).toBe("?q=a+b%26c&n=0&tags=x&tags=y");
  });
});
