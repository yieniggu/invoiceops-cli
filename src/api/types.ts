import type { CreateUserResponse } from "./schemas.js";

export type { CreateUserResponse, Group, Organization, Profile } from "./schemas.js";

export type Role = "ADMIN" | "USER";

export interface InvoicePermissions {
  readInvoices: boolean;
  createInvoices: boolean;
  deleteOwnInvoices: boolean;
  deleteOthersInvoices: boolean;
}

export interface GroupGrant {
  groupId: string;
  permissions?: InvoicePermissions;
}

export interface MembershipGrant {
  organizationId: string;
  role: Role;
  permissions?: InvoicePermissions;
  groups?: GroupGrant[];
}

/** Body of POST /admin/users. */
export interface CreateUserRequest {
  name: string;
  rut: string;
  memberships: MembershipGrant[];
  temporaryPassword?: string;
}

export type CreateUserFn = (
  request: CreateUserRequest,
) => Promise<CreateUserResponse>;
