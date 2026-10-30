import type { HttpClient } from "../http/client.js";
import type { Profile } from "./types.js";

export async function login(
  client: HttpClient,
  rut: string,
  password: string,
): Promise<void> {
  await client.request("POST", "/auth/login", { body: { rut, password } });
}

export function getProfile(client: HttpClient): Promise<Profile> {
  return client.request<Profile>("GET", "/auth/profile");
}

export async function logout(client: HttpClient): Promise<void> {
  await client.request("POST", "/auth/logout");
}
