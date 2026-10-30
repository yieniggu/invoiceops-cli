import * as p from "@clack/prompts";

import { createGroup } from "../api/groups.js";
import type { HttpClient } from "../http/client.js";
import { ask, reportError } from "../ui.js";

/** Prompts for group names until a blank answer; creates each one. */
export async function promptAndCreateGroups(
  client: HttpClient,
  organizationId: string,
): Promise<number> {
  let created = 0;
  for (;;) {
    const name = ask(
      await p.text({
        message:
          created === 0
            ? "Nombre del grupo (vacío para terminar)"
            : "Nombre de otro grupo (vacío para terminar)",
        validate: (v) =>
          (v ?? "").trim().length > 120
            ? "Máximo 120 caracteres"
            : undefined,
      }),
    ).trim();
    if (name === "") break;
    const description = ask(
      await p.text({ message: "Descripción (opcional)", defaultValue: "" }),
    ).trim();
    try {
      const group = await createGroup(client, organizationId, {
        name,
        ...(description ? { description } : {}),
      });
      created += 1;
      p.log.success(`Grupo creado: ${group.name} (${group.id})`);
    } catch (error) {
      reportError(error);
    }
  }
  return created;
}
