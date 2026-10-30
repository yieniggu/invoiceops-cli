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

/** Reports an error to the operator without stack traces. */
export function reportError(error: unknown): void {
  if (error instanceof Cancelled) {
    p.log.warn("Operación cancelada.");
    return;
  }
  if (error instanceof ApiError) {
    if (error.status === 403 && error.code !== "CLOUDFLARE_BLOCKED") {
      p.log.error(
        `${error.message} [${error.code}]\nEsta operación requiere ser administrador de la plataforma.`,
      );
    } else {
      p.log.error(`${error.message} [${error.code}]`);
    }
    return;
  }
  p.log.error(error instanceof Error ? error.message : "Error desconocido.");
}
