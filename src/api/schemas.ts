import { z } from "zod";

import { isValidRut } from "../rut.js";

// Response schemas mirror the backend ones but check only the fields the CLI
// reads. Objects are non-strict on purpose: additive backend changes must not
// break the CLI.

export const ProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  rut: z.string().refine(isValidRut, "invalid RUT"),
  mustChangePassword: z.boolean(),
  isPlatformAdministrator: z.boolean(),
});

/** GET /auth/profile answers { profile } (ProfileResponseSchema). */
export const ProfileResponseSchema = z.object({ profile: ProfileSchema });

export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  enabled: z.boolean(),
});

export const OrganizationListResponseSchema = z.object({
  organizations: z.array(OrganizationSchema),
  total: z.number().int().nonnegative(),
});

export const OrganizationCreateResponseSchema = z.object({
  organization: OrganizationSchema,
  membership: z.object({ userId: z.string(), organizationId: z.string() }),
});

export const GroupSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
});

export const GroupListResponseSchema = z.object({ groups: z.array(GroupSchema) });

export const GroupResponseSchema = z.object({ group: GroupSchema });

export const CreateUserResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
    rut: z.string(),
    mustChangePassword: z.boolean(),
  }),
  memberships: z.array(z.object({ organizationId: z.string() })),
  temporaryPassword: z.string().optional(),
});

export type Profile = z.infer<typeof ProfileSchema>;
export type Organization = z.infer<typeof OrganizationSchema>;
export type Group = z.infer<typeof GroupSchema>;
export type CreateUserResponse = z.infer<typeof CreateUserResponseSchema>;
