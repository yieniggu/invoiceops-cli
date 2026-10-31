import { afterEach, describe, expect, it, vi } from "vitest";

import { loadOrganizationNames } from "../src/commands/importUsers.js";
import { PROFILE, routedClient } from "./helpers.js";

vi.mock("@clack/prompts", () => ({
  log: { warn: vi.fn(), error: vi.fn(), message: vi.fn(), info: vi.fn(), success: vi.fn() },
  isCancel: () => false,
}));

const { log } = await import("@clack/prompts");

afterEach(() => vi.clearAllMocks());

const org = { id: "org-1", name: "Example Org", slug: "example-org", description: null, enabled: true };

describe("loadOrganizationNames", () => {
  it("maps ids to names", async () => {
    const { client } = routedClient(() =>
      Response.json({ organizations: [org], total: 1 }),
    );
    const names = await loadOrganizationNames({ client, profile: PROFILE });
    expect(names.get("org-1")).toBe("Example Org");
    expect(log.warn).not.toHaveBeenCalled();
  });

  it("warns with the cause and continues with no names on failure", async () => {
    const { client } = routedClient(() =>
      Response.json({ error: { code: "FORBIDDEN", message: "Forbidden" } }, { status: 403 }),
    );
    const names = await loadOrganizationNames({ client, profile: PROFILE });
    expect(names.size).toBe(0);
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining("Forbidden"));
  });
});
