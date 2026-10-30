import type { HttpClient } from "../http/client.js";
import type { Organization } from "./types.js";

const PAGE_SIZE = 100; // MAX_PAGE_SIZE in the backend pagination module.

interface OrganizationPage {
  organizations: Organization[];
  total: number;
}

/** GET /organizations, following pages until every organization is read. */
export async function listOrganizations(
  client: HttpClient,
): Promise<Organization[]> {
  const all: Organization[] = [];
  for (let page = 1; ; page += 1) {
    const result = await client.request<OrganizationPage>(
      "GET",
      "/organizations",
      { query: { page, pageSize: PAGE_SIZE } },
    );
    all.push(...result.organizations);
    if (result.organizations.length === 0 || all.length >= result.total) break;
  }
  return all;
}

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  description?: string;
  firstAdminRut: string;
}

export async function createOrganization(
  client: HttpClient,
  input: CreateOrganizationInput,
): Promise<Organization> {
  const result = await client.request<{ organization: Organization }>(
    "POST",
    "/organizations",
    { body: input },
  );
  return result.organization;
}
