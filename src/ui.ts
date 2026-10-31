import * as p from "@clack/prompts";

import { ApiError } from "./http/errors.js";

/** Thrown when the operator cancels a prompt (Ctrl+C / Esc). */
export class Cancelled extends Error {
  constructor() {
    super("Operación cancelada");
    this.name = "Cancelled";
  }
}

/** Unwraps a clack prompt result, converting cancellation into an exception. */
export function ask<T>(value: T): Exclude<T, symbol> {
  if (p.isCancel(value)) throw new Cancelled();
  return value as Exclude<T, symbol>;
}

// Hints by backend error code; other 403s (e.g. Cloudflare) get none.
const HINTS: Record<string, string> = {
  FORBIDDEN: "Esta operación requiere ser administrador de la plataforma.",
  FORBIDDEN_ORIGIN:
    "El servidor rechazó el origen. Revise que INVOICEOPS_URL (o --url) coincida con el PUBLIC_ORIGIN del servidor.",
};

/** Reports an error to the operator without stack traces. */
export function reportError(error: unknown): void {
  if (error instanceof Cancelled) {
    p.log.warn("Operación cancelada.");
    return;
  }
  if (error instanceof ApiError) {
    const hint = HINTS[error.code];
    p.log.error(
      `${error.message} [${error.code}]${hint ? `\n${hint}` : ""}`,
    );
    return;
  }
  p.log.error(error instanceof Error ? error.message : "Error desconocido.");
}
