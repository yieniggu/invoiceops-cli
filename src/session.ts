import * as p from "@clack/prompts";

import { getProfile, login, logout } from "./api/auth.js";
import type { Profile } from "./api/types.js";
import type { HttpClient } from "./http/client.js";
import { ApiError } from "./http/errors.js";
import { rutPromptError, toApiRut } from "./rut.js";
import { ask } from "./ui.js";

export interface Session {
  client: HttpClient;
  profile: Profile;
}

/** Authenticates (env vars or prompts) and verifies the account state. */
export async function openSession(client: HttpClient): Promise<Session> {
  // Validate the env RUT before prompting for anything or touching the network.
  const envRut = process.env["INVOICEOPS_RUT"]?.trim();
  if (envRut) {
    const envRutError = rutPromptError(envRut);
    if (envRutError) throw new Error(`INVOICEOPS_RUT inválido: ${envRutError}`);
  }
  const rutInput =
    envRut ||
    ask(
      await p.text({
        message: "RUT del administrador",
        placeholder: "11.111.111-1",
        validate: rutPromptError,
      }),
    );
  const password =
    process.env["INVOICEOPS_PASSWORD"] ||
    ask(await p.password({ message: "Contraseña" }));

  await login(client, toApiRut(rutInput), password);
  const profile = await getProfile(client);
  if (profile.mustChangePassword) {
    await logout(client).catch(() => undefined);
    throw new ApiError(
      "La cuenta tiene una contraseña temporal pendiente. Cámbiela desde la aplicación web e intente de nuevo.",
      "PASSWORD_CHANGE_REQUIRED",
    );
  }
  return { client, profile };
}

export async function closeSession(session: Session): Promise<void> {
  try {
    await logout(session.client);
  } catch {
    // Best effort: the process is exiting anyway.
  }
}
