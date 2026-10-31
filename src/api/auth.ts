import type { HttpClient } from "../http/client.js";
import { parseResponse } from "./parse.js";
import { ProfileResponseSchema } from "./schemas.js";
import type { Profile } from "./types.js";

export async function login(
  client: HttpClient,
  rut: string,
  password: string,
): Promise<void> {
  await client.request("POST", "/auth/login", { body: { rut, password } });
}

export async function getProfile(client: HttpClient): Promise<Profile> {
  // Fail closed: an unexpected shape must not read as "no password change".
  const result = await client.request<unknown>("GET", "/auth/profile");
  return parseResponse(ProfileResponseSchema, result, "/auth/profile").profile;
}

export async function logout(client: HttpClient): Promise<void> {
  await client.request("POST", "/auth/logout");
}
