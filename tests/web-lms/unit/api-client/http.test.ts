import { ApiError, CSRF_HEADER, http } from "@zwf/api-client";
import { configureHttp } from "../../../../packages/api-client/src/http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const json = (status: number, body?: unknown, contentType = "application/json") =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { "Content-Type": contentType } });

describe("http()", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    configureHttp({ baseUrl: "/api" });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("GET sends cookies and parses JSON", async () => {
    fetchMock.mockResolvedValue(json(200, { ok: true }));

    await expect(http("/auth/me")).resolves.toEqual({ ok: true });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/auth/me");
    expect(init?.credentials).toBe("include");
    expect(new Headers(init?.headers).has(CSRF_HEADER)).toBe(false);
  });

  it("primes the XSRF-TOKEN cookie before the first unsafe request", async () => {
    fetchMock.mockImplementationOnce(async () => {
      document.cookie = "XSRF-TOKEN=token-1; path=/";
      return new Response(null, { status: 204 });
    });
    fetchMock.mockResolvedValueOnce(json(200, { id: "u1" }));

    await http("/auth/login", { method: "POST", body: "{}" });

    expect(fetchMock.mock.calls[0]![0]).toBe("/api/auth/csrf");
    const headers = new Headers(fetchMock.mock.calls[1]![1]?.headers);
    expect(headers.get(CSRF_HEADER)).toBe("token-1");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("reuses an existing cookie without priming", async () => {
    document.cookie = "XSRF-TOKEN=already; path=/";
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await http("/auth/logout", { method: "POST" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(new Headers(fetchMock.mock.calls[0]![1]?.headers).get(CSRF_HEADER)).toBe("already");
  });

  it("maps ProblemDetail to ApiError with code and field errors", async () => {
    document.cookie = "XSRF-TOKEN=t; path=/";
    fetchMock.mockResolvedValue(
      json(409, { status: 409, detail: "Email is already registered", code: "EMAIL_TAKEN", errors: { email: "EMAIL_TAKEN" } }, "application/problem+json"),
    );

    const error = await http("/auth/register", { method: "POST", body: "{}" }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: "EMAIL_TAKEN", fieldErrors: { email: "EMAIL_TAKEN" }, message: "Email is already registered" });
  });

  it("handles non-JSON errors (e.g. proxy 502)", async () => {
    fetchMock.mockResolvedValue(new Response("<html>Bad gateway</html>", { status: 502, statusText: "Bad Gateway" }));

    const error = (await http("/products").catch((e: unknown) => e)) as ApiError;

    expect(error.status).toBe(502);
    expect(error.code).toBeUndefined();
    expect(error.fieldErrors).toEqual({});
  });

  it("calls the global 401 handler unless the request opts out", async () => {
    const onUnauthorized = vi.fn();
    configureHttp({ baseUrl: "/api", onUnauthorized });
    fetchMock.mockImplementation(async () => json(401, { code: "SESSION_EXPIRED" }));

    await http("/products").catch(() => undefined);
    expect(onUnauthorized).toHaveBeenCalledWith(expect.objectContaining({ status: 401, code: "SESSION_EXPIRED" }));

    onUnauthorized.mockClear();
    await http("/auth/me", { skipUnauthorizedHandler: true }).catch(() => undefined);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("202/204 resolve to undefined", async () => {
    document.cookie = "XSRF-TOKEN=t; path=/";
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 202 }));
    await expect(http("/auth/password/forgot", { method: "POST", body: "{}" })).resolves.toBeUndefined();
  });
});
