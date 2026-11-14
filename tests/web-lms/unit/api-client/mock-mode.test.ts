import { api, configureApi, isMockApi, mockAuthControl, parseMockMode } from "@zwf/api-client";
import { afterEach, describe, expect, it, vi } from "vitest";

/** I-01: значення VITE_API_MOCK і те, куди фасад api.* відправляє запити в кожному режимі. */
describe("parseMockMode", () => {
  it.each([
    [undefined, false],
    ["", false],
    ["false", false],
    [" OFF ", false],
    ["0", false],
    ["true", true],
    ["TRUE", true],
    ["1", true],
    ["all", true],
  ])("%j → %j", (value, expected) => {
    expect(parseMockMode(value)).toBe(expected);
  });

  it("accepts a comma separated list of domains without duplicates", () => {
    expect(parseMockMode("recipes")).toEqual(["recipes"]);
    expect(parseMockMode(" recipes , auth,recipes ")).toEqual(["recipes", "auth"]);
  });

  it("data means products, shopping list and recipes (auth and family stay real)", () => {
    expect(parseMockMode("data")).toEqual(["fridge", "shopping", "recipes"]);
    expect(parseMockMode("auth,data,household")).toEqual(["auth", "fridge", "shopping", "recipes", "household"]);
  });

  it("fails loudly on a typo instead of silently hitting the real backend", () => {
    expect(() => parseMockMode("dta")).toThrow(/VITE_API_MOCK: невідомі значення dta/);
  });
});

describe("configureApi mock domains", () => {
  const fetchMock = vi.fn<typeof fetch>();
  afterEach(() => configureApi({ mock: true }));

  const stubFetch = () => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  };

  it("true mocks everything, false nothing", () => {
    configureApi({ mock: true });
    expect([isMockApi("auth"), isMockApi("fridge"), isMockApi("recipes"), isMockApi()]).toEqual([true, true, true, true]);
    configureApi({ mock: false });
    expect([isMockApi("auth"), isMockApi("fridge"), isMockApi("recipes"), isMockApi()]).toEqual([false, false, false, false]);
    configureApi({});
    expect(isMockApi("fridge")).toBe(false);
  });

  it("data mode: auth goes to the backend, products stay mocked and need no mock session", async () => {
    stubFetch();
    configureApi({ mock: parseMockMode("data") });

    expect(isMockApi()).toBe(false); // демо-акаунт на сторінці входу не показуємо
    await api.auth.me();
    const products = await api.products.list();

    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual(["/api/auth/me"]);
    expect(products.total).toBe(0); // мок-дані «зовнішнього» домогосподарства — спершу порожні
    await api.products.create({ name: "Молоко", category: "dairy", quantity: 1, unit: "l", expiresAt: "2099-01-01" });
    expect((await api.products.list()).total).toBe(1);
  });

  it("auth-only mock still guards data with the mock session", async () => {
    stubFetch();
    configureApi({ mock: ["auth"] });

    await api.products.list({ q: "йогурт", category: ["dairy", "meat"], page: 2 });
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual(["/api/products?q=%D0%B9%D0%BE%D0%B3%D1%83%D1%80%D1%82&category=dairy&category=meat&page=2"]);
  });

  it("full mock keeps requiring a mock session for data (401 like Spring Security)", async () => {
    configureApi({ mock: true });
    await expect(api.products.list()).rejects.toMatchObject({ status: 401 });

    mockAuthControl.signIn();
    await expect(api.products.list()).resolves.toMatchObject({ page: 1, total: 11 });
  });
});
