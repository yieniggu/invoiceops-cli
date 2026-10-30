import type { HttpClient } from "../http/client.js";
import type { Group } from "./types.js";

/** GET /organizations/{organizationId}/groups (not paginated). */
export async function listGroups(
  client: HttpClient,
  organizationId: string,
): Promise<Group[]> {
  const result = await client.request<{ groups: Group[] }>(
    "GET",
    `/organizations/${encodeURIComponent(organizationId)}/groups`,
  );
  return result.groups;
}

export async function createGroup(
  client: HttpClient,
  organizationId: string,
  input: { name: string; description?: string },
): Promise<Group> {
  const result = await client.request<{ group: Group }>(
    "POST",
    `/organizations/${encodeURIComponent(organizationId)}/groups`,
    { body: input },
  );
  return result.group;
}
