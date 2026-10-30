/** Error raised for any failed API interaction; the message is user-facing. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number = 0,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
