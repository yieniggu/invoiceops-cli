import { afterEach, describe, expect, it, vi } from "vitest";

import { openSession } from "../src/session.js";
import { PROFILE, routedClient, withEnv } from "./helpers.js";

vi.mock("@clack/prompts", () => ({
  text: vi.fn(),
  password: vi.fn(),
  isCancel: () => false,
}));

const prompts = await import("@clack/prompts");

afterEach(() => vi.clearAllMocks());

const ok = Response.json({});

describe("openSession", () => {
  it("logs in with the API-form RUT and returns the profile", async () => {
    const { client, calls, fetchImpl } = routedClient((method, path) => {
      if (path === "/auth/login") return ok.clone();
      if (path === "/auth/profile") return Response.json({ profile: PROFILE });
      return undefined;
    });
    await withEnv(
      { INVOICEOPS_RUT: "12.345.678-5", INVOICEOPS_PASSWORD: "pw-example" },
      async () => {
        const session = await openSession(client);
        expect(session.profile.isPlatformAdministrator).toBe(true);
      },
    );
    expect(calls).toEqual(["POST /auth/login", "GET /auth/profile"]);
    const [, init] = fetchImpl.mock.calls[0] as unknown as [URL, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      rut: "12345678-5",
      password: "pw-example",
    });
  });

  it("logs out and fails when a password change is pending", async () => {
    const { client, calls } = routedClient((method, path) => {
      if (path === "/auth/login" || path === "/auth/logout") return ok.clone();
      if (path === "/auth/profile") {
        return Response.json({ profile: { ...PROFILE, mustChangePassword: true } });
      }
      return undefined;
    });
    await withEnv(
      { INVOICEOPS_RUT: "12345678-5", INVOICEOPS_PASSWORD: "pw-example" },
      async () => {
        await expect(openSession(client)).rejects.toMatchObject({
          code: "PASSWORD_CHANGE_REQUIRED",
        });
      },
    );
    expect(calls).toContain("POST /auth/logout");
  });

  it("rejects an invalid INVOICEOPS_RUT before prompting or any request", async () => {
    const { client, fetchImpl } = routedClient(() => ok.clone());
    await withEnv(
      { INVOICEOPS_RUT: "12.345.678-9", INVOICEOPS_PASSWORD: undefined },
      async () => {
        await expect(openSession(client)).rejects.toThrow(/INVOICEOPS_RUT inválido/);
      },
    );
    expect(prompts.password).not.toHaveBeenCalled();
    expect(prompts.text).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
