import { describe, expect, it } from "vitest";

import { getProfile } from "../src/api/auth.js";
import { PROFILE, routedClient } from "./helpers.js";

const profileRoute = (body: unknown) => (method: string, path: string) =>
  method === "GET" && path === "/auth/profile" ? Response.json(body) : undefined;

describe("getProfile", () => {
  it("returns the inner object of { profile }", async () => {
    const { client } = routedClient(profileRoute({ profile: PROFILE }));
    const profile = await getProfile(client);
    expect(profile).toMatchObject({
      id: "user-1",
      rut: "12345678-5",
      mustChangePassword: false,
      isPlatformAdministrator: true,
    });
  });

  it("rejects a flat profile (the old wrong shape)", async () => {
    const { client } = routedClient(profileRoute(PROFILE));
    await expect(getProfile(client)).rejects.toMatchObject({
      code: "UNEXPECTED_RESPONSE",
      message: expect.stringContaining("Respuesta inesperada") as string,
    });
  });

  it.each(["mustChangePassword", "isPlatformAdministrator"])(
    "rejects a profile without %s",
    async (field) => {
      const rest = Object.fromEntries(
        Object.entries(PROFILE).filter(([key]) => key !== field),
      );
      const { client } = routedClient(profileRoute({ profile: rest }));
      await expect(getProfile(client)).rejects.toMatchObject({
        code: "UNEXPECTED_RESPONSE",
      });
    },
  );
});
