import { describe, expect, it } from "vitest";

import {
  BatchFileError,
  summarizeBatch,
  validateBatch,
} from "../src/batch/validate.js";

const perms = {
  readInvoices: true,
  createInvoices: false,
  deleteOwnInvoices: false,
  deleteOthersInvoices: false,
};

const valid = {
  name: "Test User",
  rut: "11.111.111-1",
  memberships: [
    {
      organizationId: "org-1",
      role: "USER",
      permissions: perms,
      groups: [{ groupId: "g-1", permissions: perms }, { groupId: "g-2" }],
    },
  ],
};

function issuesOf(data: unknown): string[] {
  try {
    validateBatch(data);
  } catch (error) {
    if (error instanceof BatchFileError) return [error.message, ...error.issues];
    throw error;
  }
  return [];
}

describe("validateBatch", () => {
  it("accepts a valid file and summarizes it", () => {
    const users = validateBatch([valid, { ...valid, rut: "22.222.222-2", temporaryPassword: "longenough" }]);
    expect(users).toHaveLength(2);
    const summary = summarizeBatch(users);
    expect(summary.users).toBe(2);
    expect(summary.generatedPasswords).toBe(1);
    expect([...(summary.organizations.get("org-1") ?? [])].sort()).toEqual(["g-1", "g-2"]);
  });

  it("counts only RUTs that are neither API nor display form", () => {
    const ruts = ["11.111.111-1", "22222222-2", "123456785", " 12345678-5 ", "12.345.678-5"];
    const users = ruts.map((rut) => ({ name: "A", rut, memberships: [] }));
    expect(summarizeBatch(users).normalizedRuts).toBe(1);
  });

  it("rejects non-arrays and empty arrays", () => {
    expect(issuesOf({})[0]).toContain("arreglo");
    expect(issuesOf([])[0]).toContain("no contiene");
  });

  it("rejects an invalid RUT", () => {
    expect(issuesOf([{ ...valid, rut: "11.111.111-2" }]).join("\n")).toContain("users[0].rut");
  });

  it("rejects unknown fields, bad roles and short passwords", () => {
    const text = issuesOf([
      { ...valid, extra: 1 },
      { ...valid, rut: "22.222.222-2", memberships: [{ organizationId: "o", role: "OWNER" }] },
      { ...valid, rut: "33.333.333-3", temporaryPassword: "short" },
    ]).join("\n");
    expect(text).toContain("users[0]");
    expect(text).toContain("users[1].memberships[0].role");
    expect(text).toContain("users[2].temporaryPassword");
  });

  it("rejects partial permission objects", () => {
    const bad = { ...valid, memberships: [{ organizationId: "o", role: "USER", permissions: { readInvoices: true } }] };
    expect(issuesOf([bad]).join("\n")).toContain("permissions");
  });

  it("rejects duplicate organizations, groups and RUTs", () => {
    const dupOrg = { ...valid, memberships: [valid.memberships[0], valid.memberships[0]] };
    expect(issuesOf([dupOrg]).join("\n")).toContain("Duplicate organizationId");
    const dupGroup = { ...valid, memberships: [{ organizationId: "o", role: "USER", groups: [{ groupId: "g" }, { groupId: "g" }] }] };
    expect(issuesOf([dupGroup]).join("\n")).toContain("Duplicate groupId");
    expect(issuesOf([valid, { ...valid, rut: "11111111-1" }]).join("\n")).toContain("duplicates users[0]");
  });
});
