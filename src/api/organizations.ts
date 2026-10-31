import type { HttpClient } from "../http/client.js";
import { parseResponse } from "./parse.js";
import {
  OrganizationCreateResponseSchema,
  OrganizationListResponseSchema,
} from "./schemas.js";
import type { Organization } from "./types.js";

const PAGE_SIZE = 100; // MAX_PAGE_SIZE in the backend pagination module.

/** GET /organizations, following pages until every organization is read. */
export async function listOrganizations(
  client: HttpClient,
): Promise<Organization[]> {
  const all: Organization[] = [];
  for (let page = 1; ; page += 1) {
    const raw = await client.request<unknown>("GET", "/organizations", {
      query: { page, pageSize: PAGE_SIZE },
    });
    const result = parseResponse(
      OrganizationListResponseSchema,
      raw,
      "GET /organizations",
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
  const raw = await client.request<unknown>("POST", "/organizations", {
    body: input,
  });
  return parseResponse(
    OrganizationCreateResponseSchema,
    raw,
    "POST /organizations",
  ).organization;
}
