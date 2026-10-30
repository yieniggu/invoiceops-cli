import * as p from "@clack/prompts";

import { createGroupsCommand } from "./commands/createGroupsCommand.js";
import { createOrganizationCommand } from "./commands/createOrganization.js";
import { createUserCommand } from "./commands/createUser.js";
import { importUsersCommand } from "./commands/importUsers.js";
import type { Session } from "./session.js";
import { ask, reportError } from "./ui.js";

type Action = "org" | "groups" | "user" | "batch" | "exit";

export async function runMenu(session: Session): Promise<void> {
  if (!session.profile.isPlatformAdministrator) {
    p.log.warn(
      "Su cuenta no es administradora de la plataforma: crear organizaciones y usuarios será rechazado por el servidor.",
    );
  }
  for (;;) {
    let action: Action;
    try {
      action = ask(
        await p.select<Action>({
          message: "¿Qué desea hacer?",
          options: [
            { value: "org", label: "Crear organización" },
            { value: "groups", label: "Crear grupos en una organización existente" },
            { value: "user", label: "Crear usuario" },
            { value: "batch", label: "Crear usuarios desde un archivo JSON" },
            { value: "exit", label: "Salir" },
          ],
        }),
      );
    } catch {
      return; // Ctrl+C on the menu behaves like "Salir".
    }
    if (action === "exit") return;

    try {
      if (action === "org") await createOrganizationCommand(session);
      else if (action === "groups") await createGroupsCommand(session);
      else if (action === "user") await createUserCommand(session);
      else {
        const path = ask(
          await p.text({
            message: "Ruta del archivo JSON",
            validate: (v) => ((v ?? "").trim() ? undefined : "Requerido"),
          }),
        ).trim();
        await importUsersCommand(session, path, { yes: false });
      }
    } catch (error) {
      reportError(error);
    }
  }
}
