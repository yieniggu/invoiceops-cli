import { describe, expect, it, vi } from "vitest";

import { createHttpClient } from "../src/http/client.js";
import { ApiError } from "../src/http/errors.js";

const BASE = "https://api.example.test";

function make(responses: Response[]) {
  const fetchImpl = vi.fn(async () => {
    const next = responses.shift();
    if (!next) throw new Error("no more responses");
    return next;
  });
  const client = createHttpClient({
    baseUrl: `${BASE}/`,
    userAgent: "invoiceops-cli/test",
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });
  return { client, fetchImpl };
}

function lastInit(fetchImpl: ReturnType<typeof vi.fn>, call = 0) {
  const [url, init] = fetchImpl.mock.calls[call] as unknown as [URL, RequestInit];
  return { url: url.toString(), init, headers: init.headers as Record<string, string> };
}

describe("http client", () => {
  it("sends Origin, User-Agent, JSON body and the /api/v1 prefix", async () => {
    const { client, fetchImpl } = make([Response.json({ ok: true })]);
    await client.request("POST", "/auth/login", { body: { a: 1 } });
    const { url, init, headers } = lastInit(fetchImpl);
    expect(url).toBe(`${BASE}/api/v1/auth/login`);
    expect(init.method).toBe("POST");
    expect(headers["Origin"]).toBe(BASE);
    expect(headers["User-Agent"]).toBe("invoiceops-cli/test");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(init.body).toBe('{"a":1}');
  });

  it("stores cookies from Set-Cookie and replays them", async () => {
    const login = new Response("{}", {
      headers: [
        ["content-type", "application/json"],
        ["set-cookie", "sid=abc123; Path=/; HttpOnly"],
        ["set-cookie", "csrf=xyz; Path=/"],
      ],
    });
    const { client, fetchImpl } = make([login, Response.json({})]);
    await client.request("POST", "/auth/login");
    await client.request("GET", "/auth/profile", { query: { page: 2 } });
    const second = lastInit(fetchImpl, 1);
    expect(second.headers["Cookie"]).toBe("sid=abc123; csrf=xyz");
    expect(second.url).toBe(`${BASE}/api/v1/auth/profile?page=2`);
  });

  it("drops cookies cleared by the server", async () => {
    const set = new Response("{}", { headers: { "set-cookie": "sid=abc; Path=/" } });
    const clear = new Response("{}", {
      headers: { "set-cookie": "sid=; Max-Age=0; Path=/" },
    });
    const { client, fetchImpl } = make([set, clear, Response.json({})]);
    await client.request("POST", "/a");
    await client.request("POST", "/b");
    await client.request("GET", "/c");
    expect(lastInit(fetchImpl, 2).headers["Cookie"]).toBeUndefined();
  });

  it("maps the error envelope", async () => {
    const { client } = make([
      Response.json({ error: { code: "USER_CONFLICT", message: "exists" } }, { status: 409 }),
    ]);
    await expect(client.request("POST", "/admin/users")).rejects.toMatchObject({
      code: "USER_CONFLICT",
      message: "exists",
      status: 409,
    });
  });

  it("maps a non-JSON 403 containing 1010 to a Cloudflare message", async () => {
    const { client } = make([
      new Response("error code: 1010", { status: 403 }),
    ]);
    await expect(client.request("GET", "/x")).rejects.toMatchObject({
      code: "CLOUDFLARE_BLOCKED",
    });
  });

  it("reports 503 as retryable", async () => {
    const { client } = make([new Response("busy", { status: 503 })]);
    await expect(client.request("GET", "/x")).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
      status: 503,
    });
  });

  it("turns network failures into readable errors", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("fetch failed", { cause: { code: "ENOTFOUND" } });
    });
    const client = createHttpClient({
      baseUrl: BASE,
      userAgent: "ua",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const error = await client.request("GET", "/x").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("NETWORK_ERROR");
    expect((error as ApiError).message).toContain("ENOTFOUND");
  });

  it("rejects invalid base URLs", () => {
    expect(() => createHttpClient({ baseUrl: "nope", userAgent: "ua" })).toThrow(ApiError);
  });
});
