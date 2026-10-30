import * as p from "@clack/prompts";

import { listOrganizations } from "../api/organizations.js";
import { pickOrganization } from "../prompts/pickers.js";
import type { Session } from "../session.js";
import { promptAndCreateGroups } from "./createGroups.js";

export async function createGroupsCommand(session: Session): Promise<void> {
  const organizations = await listOrganizations(session.client);
  if (organizations.length === 0) {
    p.log.warn("No hay organizaciones disponibles.");
    return;
  }
  const organization = await pickOrganization(organizations);
  const count = await promptAndCreateGroups(session.client, organization.id);
  p.log.info(`Grupos creados: ${count}`);
}
