import type { HttpClient } from "../http/client.js";
import type { CreateUserRequest, CreateUserResponse } from "./types.js";

/** POST /admin/users (platform administrator only). */
export function createUser(
  client: HttpClient,
  request: CreateUserRequest,
): Promise<CreateUserResponse> {
  return client.request<CreateUserResponse>("POST", "/admin/users", {
    body: request,
  });
}
