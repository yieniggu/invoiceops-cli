export type Role = "ADMIN" | "USER";

export interface InvoicePermissions {
  readInvoices: boolean;
  createInvoices: boolean;
  deleteOwnInvoices: boolean;
  deleteOthersInvoices: boolean;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  enabled: boolean;
}

export interface Group {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
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

export interface CreateUserResponse {
  user: { id: string; name: string; rut: string; mustChangePassword: boolean };
  memberships: unknown[];
  temporaryPassword?: string;
}

export interface Profile {
  id: string;
  name: string;
  rut: string;
  mustChangePassword: boolean;
  isPlatformAdministrator: boolean;
}

export type CreateUserFn = (
  request: CreateUserRequest,
) => Promise<CreateUserResponse>;
