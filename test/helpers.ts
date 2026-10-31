import { vi } from "vitest";

import { createHttpClient } from "../src/http/client.js";

export type Route = (method: string, path: string) => Response | undefined;

/** HTTP client over a mocked fetch; `route` answers by method and path. */
export function routedClient(route: Route) {
  const calls: string[] = [];
  const fetchImpl = vi.fn((input: URL | string, init?: RequestInit) => {
    const url = new URL(input);
    const method = init?.method ?? "GET";
    const path = url.pathname.replace("/api/v1", "");
    calls.push(`${method} ${path}`);
    const response = route(method, path);
    return Promise.resolve(response ?? Response.json({}, { status: 404 }));
  });
  const client = createHttpClient({
    baseUrl: "https://api.example.test",
    userAgent: "invoiceops-cli/test",
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });
  return { client, calls, fetchImpl };
}

export const PROFILE = {
  id: "user-1",
  name: "Example Admin",
  rut: "12345678-5",
  email: null,
  mustChangePassword: false,
  isPlatformAdministrator: true,
  memberships: [],
};

/** Runs `fn` with the given env vars set, restoring them afterwards. */
export async function withEnv(
  vars: Record<string, string | undefined>,
  fn: () => Promise<void>,
): Promise<void> {
  const saved = Object.fromEntries(
    Object.keys(vars).map((k) => [k, process.env[k]]),
  );
  const apply = (values: Record<string, string | undefined>) => {
    for (const [k, v] of Object.entries(values)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  };
  apply(vars);
  try {
    await fn();
  } finally {
    apply(saved);
  }
}
