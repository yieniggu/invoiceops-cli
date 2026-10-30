import { chmod, open } from "node:fs/promises";

import { ApiError } from "../http/errors.js";
import type { CreateUserFn, CreateUserRequest } from "../api/types.js";

export interface BatchResult {
  index: number;
  name: string;
  rut: string;
  ok: boolean;
  errorCode?: string;
  errorMessage?: string;
  /** Present only when the server generated it. Never print this field. */
  temporaryPassword?: string;
}

export interface BatchTotals {
  ok: number;
  failed: number;
}

/** Creates users one by one; a failure never stops the remaining ones. */
export async function runBatch(
  users: CreateUserRequest[],
  create: CreateUserFn,
  onResult?: (result: BatchResult, total: number) => void,
): Promise<BatchResult[]> {
  const results: BatchResult[] = [];
  for (const [index, user] of users.entries()) {
    let result: BatchResult;
    try {
      const response = await create(user);
      result = {
        index,
        name: user.name,
        rut: user.rut,
        ok: true,
        ...(response.temporaryPassword
          ? { temporaryPassword: response.temporaryPassword }
          : {}),
      };
    } catch (error) {
      result = {
        index,
        name: user.name,
        rut: user.rut,
        ok: false,
        errorCode: error instanceof ApiError ? error.code : "UNKNOWN_ERROR",
        errorMessage:
          error instanceof Error ? error.message : "Error desconocido",
      };
    }
    results.push(result);
    onResult?.(result, users.length);
  }
  return results;
}

export function totals(results: BatchResult[]): BatchTotals {
  const ok = results.filter((r) => r.ok).length;
  return { ok, failed: results.length - ok };
}

export function passwordFilePath(inputPath: string): string {
  return `${inputPath}.passwords.json`;
}

/**
 * Writes server-generated temporary passwords to `<input>.passwords.json`
 * with mode 0600. Returns the path, or null when there was nothing to write.
 */
export async function writePasswordFile(
  inputPath: string,
  results: BatchResult[],
): Promise<string | null> {
  const entries = results
    .filter((r) => r.ok && r.temporaryPassword !== undefined)
    .map((r) => ({
      rut: r.rut,
      name: r.name,
      temporaryPassword: r.temporaryPassword,
    }));
  if (entries.length === 0) return null;

  const path = passwordFilePath(inputPath);
  const handle = await open(path, "w", 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(entries, null, 2)}\n`);
  } finally {
    await handle.close();
  }
  // `open` honors the mode only when creating the file; enforce it on reuse.
  await chmod(path, 0o600);
  return path;
}
