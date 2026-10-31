import * as p from "@clack/prompts";

import { createOrganization } from "../api/organizations.js";
import { displayRut, formatRut, rutPromptError, toApiRut } from "../rut.js";
import type { Session } from "../session.js";
import { ask } from "../ui.js";
import { promptAndCreateGroups } from "./createGroups.js";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function suggestSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createOrganizationCommand(
  session: Session,
): Promise<void> {
  const name = ask(
    await p.text({
      message: "Nombre de la organización",
      validate: (v) => {
        const t = (v ?? "").trim();
        return t.length === 0 || t.length > 120
          ? "Debe tener entre 1 y 120 caracteres"
          : undefined;
      },
    }),
  ).trim();
  const slug = ask(
    await p.text({
      message: "Slug (minúsculas, números y guiones)",
      initialValue: suggestSlug(name),
      validate: (v) =>
        SLUG_PATTERN.test(v ?? "") ? undefined : "Slug inválido",
    }),
  );
  const description = ask(
    await p.text({ message: "Descripción (opcional)", defaultValue: "" }),
  ).trim();
  const firstAdminRut = toApiRut(
    ask(
      await p.text({
        message:
          "RUT del primer administrador (debe ser un usuario existente)",
        placeholder: "11.111.111-1",
        initialValue: displayRut(session.profile.rut),
        validate: rutPromptError,
      }),
    ),
  );
  p.log.info(`Primer administrador: ${formatRut(firstAdminRut)}`);

  const organization = await createOrganization(session.client, {
    name,
    slug,
    firstAdminRut,
    ...(description ? { description } : {}),
  });
  p.log.success(`Organización creada: ${organization.name} (${organization.id})`);

  const wantsGroups = ask(
    await p.confirm({ message: "¿Crear grupos en esta organización?" }),
  );
  if (wantsGroups) {
    const count = await promptAndCreateGroups(session.client, organization.id);
    p.log.info(`Grupos creados: ${count}`);
  }
}
