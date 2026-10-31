import * as p from "@clack/prompts";

import { listOrganizations } from "../api/organizations.js";
import { createUser } from "../api/users.js";
import { runBatch, totals, writePasswordFile } from "../batch/run.js";
import { BatchFileError, loadBatchFile, summarizeBatch } from "../batch/validate.js";
import type { Session } from "../session.js";
import { ask } from "../ui.js";
import type { CreateUserRequest } from "../api/types.js";

/** Reads and validates a batch file; prints the issues and returns null on failure. */
export async function loadOrReport(
  path: string,
): Promise<CreateUserRequest[] | null> {
  try {
    return await loadBatchFile(path);
  } catch (error) {
    if (error instanceof BatchFileError) {
      p.log.error(error.message);
      if (error.issues.length > 0) {
        p.log.message(error.issues.slice(0, 30).map((i) => `- ${i}`).join("\n"));
        if (error.issues.length > 30) {
          p.log.message(`... y ${error.issues.length - 30} más`);
        }
      }
      return null;
    }
    throw error;
  }
}

/** Organization names by id; a failure only degrades the summary. */
export async function loadOrganizationNames(
  session: Session,
): Promise<Map<string, string>> {
  try {
    const organizations = await listOrganizations(session.client);
    return new Map(organizations.map((o) => [o.id, o.name]));
  } catch (error) {
    const cause = error instanceof Error ? error.message : "error desconocido";
    p.log.warn(
      `No se pudo obtener la lista de organizaciones (${cause}). El resumen no mostrará sus nombres.`,
    );
    return new Map();
  }
}

export async function importUsersCommand(
  session: Session,
  path: string,
  options: { yes: boolean; preloaded?: CreateUserRequest[] },
): Promise<boolean> {
  const users = options.preloaded ?? (await loadOrReport(path));
  if (!users) return false;

  const summary = summarizeBatch(users);
  const names = await loadOrganizationNames(session);
  const orgLines = [...summary.organizations].map(([id, groups]) => {
    const label = names.get(id) ?? "(no encontrada en su lista)";
    return `- ${label}: ${groups.size} grupo(s) referenciado(s)`;
  });
  p.note(
    [
      `Usuarios: ${summary.users}`,
      ...(summary.normalizedRuts > 0
        ? [`RUTs que se normalizarán: ${summary.normalizedRuts}`]
        : []),
      `Organizaciones involucradas: ${summary.organizations.size}`,
      ...orgLines,
      `Contraseñas generadas por el servidor: ${summary.generatedPasswords}`,
    ].join("\n"),
    "Resumen del archivo",
  );

  if (!options.yes) {
    const go = ask(await p.confirm({ message: "¿Crear estos usuarios?" }));
    if (!go) {
      p.log.warn("Operación cancelada.");
      return false;
    }
  }

  const results = await runBatch(
    users,
    (request) => createUser(session.client, request),
    (result, total) => {
      const position = `[${result.index + 1}/${total}]`;
      if (result.ok) {
        p.log.success(`${position} OK   ${result.rut}  ${result.name}`);
      } else {
        p.log.error(
          `${position} FAIL ${result.rut}  ${result.name} - ${result.errorCode}: ${result.errorMessage}`,
        );
      }
    },
  );

  const { ok, failed } = totals(results);
  const passwordsPath = await writePasswordFile(path, results);
  if (passwordsPath) {
    p.log.info(
      `Contraseñas temporales generadas guardadas en ${passwordsPath} (permisos 0600).`,
    );
  }
  p.log.info(`Total: ${ok} creados, ${failed} fallidos, ${results.length} procesados.`);
  return failed === 0;
}
