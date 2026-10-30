import * as p from "@clack/prompts";

import type {
  Group,
  InvoicePermissions,
  Organization,
} from "../api/types.js";
import { ask } from "../ui.js";

const PERMISSION_LABELS: Array<[keyof InvoicePermissions, string]> = [
  ["readInvoices", "Ver facturas"],
  ["createInvoices", "Crear facturas"],
  ["deleteOwnInvoices", "Eliminar facturas propias"],
  ["deleteOthersInvoices", "Eliminar facturas de otros"],
];

export function describePermissions(permissions: InvoicePermissions): string {
  const active = PERMISSION_LABELS.filter(([key]) => permissions[key]).map(
    ([, label]) => label,
  );
  return active.length > 0 ? active.join(", ") : "sin permisos";
}

export async function pickOrganization(
  organizations: Organization[],
  message = "Seleccione una organización",
): Promise<Organization> {
  const id = ask(
    await p.select({
      message,
      options: organizations.map((o) => ({
        value: o.id,
        label: o.name,
        hint: o.slug,
      })),
    }),
  );
  const found = organizations.find((o) => o.id === id);
  if (!found) throw new Error("Organización no encontrada");
  return found;
}

export async function pickGroups(
  groups: Group[],
  message = "Seleccione los grupos",
): Promise<Group[]> {
  const ids = ask(
    await p.multiselect({
      message: `${message} (espacio para marcar, enter para confirmar)`,
      options: groups.map((g) => ({ value: g.id, label: g.name })),
      required: false,
    }),
  );
  return groups.filter((g) => ids.includes(g.id));
}

export async function pickPermissions(
  message: string,
): Promise<InvoicePermissions> {
  const selected = ask(
    await p.multiselect({
      message: `${message} (espacio para marcar, enter para confirmar)`,
      options: PERMISSION_LABELS.map(([value, label]) => ({ value, label })),
      required: false,
    }),
  );
  return {
    readInvoices: selected.includes("readInvoices"),
    createInvoices: selected.includes("createInvoices"),
    deleteOwnInvoices: selected.includes("deleteOwnInvoices"),
    deleteOthersInvoices: selected.includes("deleteOthersInvoices"),
  };
}
