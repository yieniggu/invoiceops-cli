import type { HttpClient } from "../http/client.js";
import { parseResponse } from "./parse.js";
import { GroupListResponseSchema, GroupResponseSchema } from "./schemas.js";
import type { Group } from "./types.js";

/** GET /organizations/{organizationId}/groups (not paginated). */
export async function listGroups(
  client: HttpClient,
  organizationId: string,
): Promise<Group[]> {
  const path = `/organizations/${encodeURIComponent(organizationId)}/groups`;
  const result = await client.request<unknown>("GET", path);
  return parseResponse(GroupListResponseSchema, result, `GET ${path}`).groups;
}

export async function createGroup(
  client: HttpClient,
  organizationId: string,
  input: { name: string; description?: string },
): Promise<Group> {
  const path = `/organizations/${encodeURIComponent(organizationId)}/groups`;
  const result = await client.request<unknown>("POST", path, { body: input });
  return parseResponse(GroupResponseSchema, result, `POST ${path}`).group;
}
