import type { HttpClient } from "../http/client.js";
import { parseResponse } from "./parse.js";
import { CreateUserResponseSchema } from "./schemas.js";
import type { CreateUserRequest, CreateUserResponse } from "./types.js";

/** POST /admin/users (platform administrator only). */
export async function createUser(
  client: HttpClient,
  request: CreateUserRequest,
): Promise<CreateUserResponse> {
  const raw = await client.request<unknown>("POST", "/admin/users", {
    body: request,
  });
  return parseResponse(CreateUserResponseSchema, raw, "POST /admin/users");
}
