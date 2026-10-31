import * as p from "@clack/prompts";

import { listGroups } from "../api/groups.js";
import { listOrganizations } from "../api/organizations.js";
import type { MembershipGrant, Role } from "../api/types.js";
import { createUser } from "../api/users.js";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "../batch/validate.js";
import {
  describePermissions,
  pickGroups,
  pickOrganization,
  pickPermissions,
} from "../prompts/pickers.js";
import { formatRut, rutPromptError, toApiRut } from "../rut.js";
import type { Session } from "../session.js";
import { ask } from "../ui.js";

export async function createUserCommand(session: Session): Promise<void> {
  const { client } = session;

  const name = ask(
    await p.text({
      message: "Nombre completo",
      validate: (v) => {
        const t = (v ?? "").trim();
        return t.length === 0 || t.length > 120
          ? "Debe tener entre 1 y 120 caracteres"
          : undefined;
      },
    }),
  ).trim();
  const rut = toApiRut(
    ask(
      await p.text({
        message: "RUT (con o sin puntos/guion)",
        placeholder: "11.111.111-1",
        validate: rutPromptError,
      }),
    ),
  );
  p.log.info(`RUT: ${formatRut(rut)}`);
  const temporaryPassword = ask(
    await p.password({
      message: "Contraseña temporal (vacío = la genera el servidor)",
      validate: (v) =>
        !v || (v.length >= MIN_PASSWORD_LENGTH && v.length <= MAX_PASSWORD_LENGTH)
          ? undefined
          : `Debe tener entre ${MIN_PASSWORD_LENGTH} y ${MAX_PASSWORD_LENGTH} caracteres`,
    }),
  );

  const organizations = await listOrganizations(client);
  if (organizations.length === 0) {
    p.log.warn("No hay organizaciones disponibles para asignar membresías.");
    return;
  }

  const memberships: MembershipGrant[] = [];
  const labels: string[] = [];
  for (;;) {
    const available = organizations.filter(
      (o) => !memberships.some((m) => m.organizationId === o.id),
    );
    if (available.length === 0) break;

    const organization = await pickOrganization(available);
    const role = ask(
      await p.select<Role>({
        message: `Rol en ${organization.name}`,
        options: [
          { value: "USER", label: "USER" },
          { value: "ADMIN", label: "ADMIN" },
        ],
      }),
    );
    const permissions = await pickPermissions(
      `Permisos de facturas en ${organization.name}`,
    );

    const groups = await listGroups(client, organization.id);
    const grants: NonNullable<MembershipGrant["groups"]> = [];
    const groupLabels: string[] = [];
    if (groups.length > 0) {
      for (const group of await pickGroups(
        groups,
        `Grupos de ${organization.name}`,
      )) {
        const groupPermissions = await pickPermissions(
          `Permisos en el grupo ${group.name}`,
        );
        grants.push({ groupId: group.id, permissions: groupPermissions });
        groupLabels.push(`${group.name}: ${describePermissions(groupPermissions)}`);
      }
    } else {
      p.log.info(`${organization.name} no tiene grupos.`);
    }

    memberships.push({
      organizationId: organization.id,
      role,
      permissions,
      groups: grants,
    });
    labels.push(
      [
        `${organization.name} [${role}] - ${describePermissions(permissions)}`,
        ...groupLabels.map((l) => `  grupo ${l}`),
      ].join("\n"),
    );

    if (available.length === 1) break;
    const more = ask(
      await p.confirm({ message: "¿Agregar otra organización?", initialValue: false }),
    );
    if (!more) break;
  }

  p.note(
    [
      `Nombre: ${name}`,
      `RUT: ${formatRut(rut)}`,
      `Contraseña: ${temporaryPassword ? "definida por usted" : "la generará el servidor"}`,
      ...labels,
    ].join("\n"),
    "Resumen",
  );
  if (!ask(await p.confirm({ message: "¿Crear usuario?" }))) {
    p.log.warn("Operación cancelada.");
    return;
  }

  const response = await createUser(client, {
    name,
    rut,
    memberships,
    ...(temporaryPassword ? { temporaryPassword } : {}),
  });
  p.log.success(`Usuario creado: ${response.user.name} (${response.user.id})`);
  if (response.temporaryPassword) {
    p.note(
      response.temporaryPassword,
      "Contraseña temporal (se muestra una sola vez)",
    );
  }
}
