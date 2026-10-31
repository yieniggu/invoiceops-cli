import { describe, expect, it } from "vitest";

import { getProfile } from "../src/api/auth.js";
import { createGroup, listGroups } from "../src/api/groups.js";
import { createOrganization, listOrganizations } from "../src/api/organizations.js";
import { createUser } from "../src/api/users.js";
import type { HttpClient } from "../src/http/client.js";
import { PROFILE, routedClient } from "./helpers.js";

const org = { id: "org-1", name: "Example Org", slug: "example-org", description: null, enabled: true };
const group = { id: "g-1", organizationId: "org-1", name: "Finance", description: null };
const membership = { userId: "user-1", organizationId: "org-1", role: "ADMIN" };
const created = {
  user: { id: "u-1", name: "Example User", rut: "11111111-1", mustChangePassword: true },
  memberships: [{ organizationId: "org-1" }],
};

interface Case {
  name: string;
  method: string;
  path: string;
  valid: unknown;
  malformed: unknown;
  call: (client: HttpClient) => Promise<unknown>;
}

const cases: Case[] = [
  {
    name: "GET /auth/profile",
    method: "GET",
    path: "/auth/profile",
    valid: { profile: PROFILE },
    malformed: { profile: { ...PROFILE, rut: "not-a-rut" } },
    call: (c) => getProfile(c),
  },
  {
    name: "GET /organizations",
    method: "GET",
    path: "/organizations",
    valid: { organizations: [org], page: 1, pageSize: 100, total: 1 },
    malformed: { organizations: [{ ...org, enabled: "yes" }], total: 1 },
    call: (c) => listOrganizations(c),
  },
  {
    name: "POST /organizations",
    method: "POST",
    path: "/organizations",
    valid: { organization: org, membership },
    malformed: { organization: org },
    call: (c) =>
      createOrganization(c, { name: "x", slug: "x", firstAdminRut: "11111111-1" }),
  },
  {
    name: "GET /organizations/org-1/groups",
    method: "GET",
    path: "/organizations/org-1/groups",
    valid: { groups: [group] },
    malformed: { groups: [{ id: "g-1" }] },
    call: (c) => listGroups(c, "org-1"),
  },
  {
    name: "POST /organizations/org-1/groups",
    method: "POST",
    path: "/organizations/org-1/groups",
    valid: { group },
    malformed: { group: { ...group, name: 5 } },
    call: (c) => createGroup(c, "org-1", { name: "Finance" }),
  },
  {
    name: "POST /admin/users",
    method: "POST",
    path: "/admin/users",
    valid: { ...created, temporaryPassword: "generated-secret", extra: true },
    malformed: { user: created.user },
    call: (c) =>
      createUser(c, { name: "Example User", rut: "11111111-1", memberships: [] }),
  },
];

describe.each(cases)("response validation: $name", (testCase) => {
  const clientFor = (body: unknown) =>
    routedClient((method, path) =>
      method === testCase.method && path === testCase.path
        ? Response.json(body)
        : undefined,
    ).client;

  it("accepts a valid response (extra fields allowed)", async () => {
    await expect(testCase.call(clientFor(testCase.valid))).resolves.toBeDefined();
  });

  it("throws UNEXPECTED_RESPONSE naming the endpoint on a malformed one", async () => {
    await expect(testCase.call(clientFor(testCase.malformed))).rejects.toMatchObject({
      code: "UNEXPECTED_RESPONSE",
      message: expect.stringContaining(testCase.path) as string,
    });
  });
});
