import type { z } from "zod";

import { ApiError } from "../http/errors.js";

/** Validates a response body; a mismatch names the endpoint and the field. */
export function parseResponse<S extends z.ZodType>(
  schema: S,
  data: unknown,
  endpoint: string,
): z.infer<S> {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  const path = result.error.issues[0]?.path.join(".");
  throw new ApiError(
    `Respuesta inesperada de ${endpoint}${path ? ` (campo: ${path})` : ""}`,
    "UNEXPECTED_RESPONSE",
  );
}
