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
    expect(parseMockMode("data")).toEqual(["data"]);
    expect(parseMockMode(" data , auth,data ")).toEqual(["data", "auth"]);
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
    expect([isMockApi("auth"), isMockApi("data"), isMockApi()]).toEqual([true, true, true]);
    configureApi({ mock: false });
    expect([isMockApi("auth"), isMockApi("data"), isMockApi()]).toEqual([false, false, false]);
    configureApi({});
    expect(isMockApi("data")).toBe(false);
  });

  it("data mode: auth goes to the backend, products stay mocked and need no mock session", async () => {
    stubFetch();
    configureApi({ mock: ["data"] });

    expect(isMockApi()).toBe(false); // демо-акаунт на сторінці входу не показуємо
    await api.auth.me();
    const products = await api.products.list();

    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual(["/api/auth/me"]);
    expect(products.length).toBeGreaterThan(0);
  });

  it("auth-only mock still guards data with the mock session", async () => {
    stubFetch();
    configureApi({ mock: ["auth"] });

    await api.products.list();
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual(["/api/products"]);
  });

  it("full mock keeps requiring a mock session for data (401 like Spring Security)", async () => {
    configureApi({ mock: true });
    await expect(api.products.list()).rejects.toMatchObject({ status: 401 });

    mockAuthControl.signIn();
    await expect(api.products.list()).resolves.not.toHaveLength(0);
  });
});
