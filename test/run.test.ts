import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import type { CreateUserRequest } from "../src/api/types.js";
import { passwordFilePath, runBatch, totals, writePasswordFile } from "../src/batch/run.js";
import { ApiError } from "../src/http/errors.js";

const users: CreateUserRequest[] = [
  { name: "A", rut: "11.111.111-1", memberships: [] },
  { name: "B", rut: "22.222.222-2", memberships: [] },
  { name: "C", rut: "33.333.333-3", memberships: [], temporaryPassword: "chosen-pass" },
];

describe("runBatch", () => {
  it("continues after failures and records error codes", async () => {
    const results = await runBatch(users, async (request) => {
      if (request.name === "B") throw new ApiError("exists", "USER_CONFLICT", 409);
      return {
        user: { id: "u", name: request.name, rut: request.rut, mustChangePassword: true },
        memberships: [],
        ...(request.name === "A" ? { temporaryPassword: "generated-secret" } : {}),
      };
    });
    expect(results.map((r) => r.ok)).toEqual([true, false, true]);
    expect(results[1]).toMatchObject({ errorCode: "USER_CONFLICT" });
    expect(totals(results)).toEqual({ ok: 2, failed: 1 });
  });

  it("writes only server-generated passwords, with mode 0600", async () => {
    const dir = await mkdtemp(join(tmpdir(), "invoiceops-cli-"));
    const input = join(dir, "users.json");
    const results = await runBatch(users, async (request) => ({
      user: { id: "u", name: request.name, rut: request.rut, mustChangePassword: true },
      memberships: [],
      ...(request.name === "A" ? { temporaryPassword: "generated-secret" } : {}),
    }));
    const path = await writePasswordFile(input, results);
    expect(path).toBe(passwordFilePath(input));
    const mode = (await stat(path as string)).mode & 0o777;
    expect(mode).toBe(0o600);
    const content = JSON.parse(await readFile(path as string, "utf8"));
    expect(content).toEqual([
      { rut: "11.111.111-1", name: "A", temporaryPassword: "generated-secret" },
    ]);
  });

  it("tightens the mode of a pre-existing password file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "invoiceops-cli-"));
    const input = join(dir, "users.json");
    await writeFile(passwordFilePath(input), "old", { mode: 0o644 });
    const path = await writePasswordFile(input, [
      { index: 0, name: "A", rut: "11.111.111-1", ok: true, temporaryPassword: "x-generated" },
    ]);
    expect((await stat(path as string)).mode & 0o777).toBe(0o600);
  });

  it("writes nothing when no password was generated", async () => {
    const path = await writePasswordFile("/nonexistent/users.json", [
      { index: 0, name: "A", rut: "11.111.111-1", ok: true },
    ]);
    expect(path).toBeNull();
  });
});
