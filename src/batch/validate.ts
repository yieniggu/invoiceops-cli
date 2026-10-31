import { readFile } from "node:fs/promises";
import { z } from "zod";

import type { CreateUserRequest } from "../api/types.js";
import { canonicalRut, formatRut, isValidRut, toApiRut } from "../rut.js";

export const MAX_ORGANIZATIONS_PER_USER = 50;
export const MAX_GROUPS_PER_MEMBERSHIP = 200;
export const MAX_TOTAL_GROUP_GRANTS = 200;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 256;

const hasNoNul = (value: string) => !value.includes("\u0000");

const PermissionsSchema = z.strictObject({
  readInvoices: z.boolean(),
  createInvoices: z.boolean(),
  deleteOwnInvoices: z.boolean(),
  deleteOthersInvoices: z.boolean(),
});

const GroupGrantSchema = z.strictObject({
  groupId: z.string().trim().min(1),
  permissions: PermissionsSchema.optional(),
});

const MembershipSchema = z
  .strictObject({
    organizationId: z.string().trim().min(1),
    role: z.enum(["ADMIN", "USER"]),
    permissions: PermissionsSchema.optional(),
    groups: z.array(GroupGrantSchema).max(MAX_GROUPS_PER_MEMBERSHIP).optional(),
  })
  .superRefine((membership, ctx) => {
    const seen = new Set<string>();
    membership.groups?.forEach((group, index) => {
      if (seen.has(group.groupId)) {
        ctx.addIssue({
          code: "custom",
          message: "Duplicate groupId",
          path: ["groups", index, "groupId"],
        });
      }
      seen.add(group.groupId);
    });
  });

export const UserRequestSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(120).refine(hasNoNul, "NUL not allowed"),
    rut: z.string().refine((v) => canonicalRut(v) !== null, "Invalid RUT"),
    memberships: z.array(MembershipSchema).max(MAX_ORGANIZATIONS_PER_USER),
    temporaryPassword: z
      .string()
      .min(MIN_PASSWORD_LENGTH)
      .max(MAX_PASSWORD_LENGTH)
      .optional(),
  })
  .superRefine((request, ctx) => {
    const grants = request.memberships.reduce(
      (total, m) => total + (m.groups?.length ?? 0),
      0,
    );
    if (grants > MAX_TOTAL_GROUP_GRANTS) {
      ctx.addIssue({
        code: "custom",
        message: `At most ${MAX_TOTAL_GROUP_GRANTS} group grants in total`,
        path: ["memberships"],
      });
    }
    const seen = new Set<string>();
    request.memberships.forEach((m, index) => {
      if (seen.has(m.organizationId)) {
        ctx.addIssue({
          code: "custom",
          message: "Duplicate organizationId",
          path: ["memberships", index, "organizationId"],
        });
      }
      seen.add(m.organizationId);
    });
  });

export class BatchFileError extends Error {
  constructor(
    message: string,
    readonly issues: string[] = [],
  ) {
    super(message);
    this.name = "BatchFileError";
  }
}

function formatPath(path: ReadonlyArray<PropertyKey>): string {
  return path.reduce<string>(
    (acc, part) =>
      typeof part === "number" ? `${acc}[${part}]` : `${acc}.${String(part)}`,
    "users",
  );
}

/** Validates already-parsed JSON; throws BatchFileError listing every problem. */
export function validateBatch(data: unknown): CreateUserRequest[] {
  if (!Array.isArray(data)) {
    throw new BatchFileError("El archivo debe contener un arreglo JSON de usuarios.");
  }
  if (data.length === 0) {
    throw new BatchFileError("El archivo no contiene usuarios.");
  }

  const issues: string[] = [];
  const users: CreateUserRequest[] = [];
  const seenRuts = new Map<string, number>();

  data.forEach((item, index) => {
    const result = UserRequestSchema.safeParse(item);
    if (!result.success) {
      for (const issue of result.error.issues) {
        issues.push(`${formatPath([index, ...issue.path])}: ${issue.message}`);
      }
      return;
    }
    const rut = canonicalRut(result.data.rut) ?? result.data.rut;
    const first = seenRuts.get(rut);
    if (first !== undefined) {
      issues.push(`users[${index}].rut: duplicates users[${first}]`);
    } else {
      seenRuts.set(rut, index);
    }
    users.push(result.data);
  });

  if (issues.length > 0) {
    throw new BatchFileError(
      `El archivo tiene ${issues.length} problema(s) de validación.`,
      issues,
    );
  }
  return users;
}

export async function loadBatchFile(path: string): Promise<CreateUserRequest[]> {
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code ?? "desconocido";
    throw new BatchFileError(`No se pudo leer el archivo "${path}" (${code}).`);
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BatchFileError(`El archivo "${path}" no es JSON válido.`);
  }
  return validateBatch(data);
}

export interface BatchSummary {
  users: number;
  normalizedRuts: number; // RUTs that are neither API nor display form
  organizations: Map<string, Set<string>>; // organizationId -> groupIds
  generatedPasswords: number; // users that will get a server-generated password
}

/** Users whose RUT is neither in API form nor in display form. */
export function countNormalizedRuts(users: CreateUserRequest[]): number {
  return users.filter((user) => {
    if (!isValidRut(user.rut)) return false;
    const rut = user.rut.trim();
    return rut !== toApiRut(rut) && rut !== formatRut(rut);
  }).length;
}

export function summarizeBatch(users: CreateUserRequest[]): BatchSummary {
  const organizations = new Map<string, Set<string>>();
  for (const user of users) {
    for (const membership of user.memberships) {
      const groups =
        organizations.get(membership.organizationId) ?? new Set<string>();
      for (const group of membership.groups ?? []) groups.add(group.groupId);
      organizations.set(membership.organizationId, groups);
    }
  }
  return {
    users: users.length,
    normalizedRuts: countNormalizedRuts(users),
    organizations,
    generatedPasswords: users.filter((u) => u.temporaryPassword === undefined)
      .length,
  };
}
