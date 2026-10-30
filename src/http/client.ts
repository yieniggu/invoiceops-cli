import { ApiError } from "./errors.js";

export const API_PREFIX = "/api/v1";
const REQUEST_TIMEOUT_MS = 30_000;

export interface RequestOptions {
  body?: unknown;
  query?: Record<string, string | number | undefined>;
}

export interface HttpClient {
  readonly baseUrl: string;
  request<T>(
    method: string,
    path: string,
    options?: RequestOptions,
  ): Promise<T>;
}

export interface HttpClientConfig {
  baseUrl: string;
  userAgent: string;
  fetchImpl?: typeof fetch;
}

/** Normalizes a base URL; throws ApiError when it is not an http(s) URL. */
export function normalizeBaseUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new ApiError(`URL inválida: "${input}"`, "INVALID_URL");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new ApiError(`URL inválida: "${input}"`, "INVALID_URL");
  }
  return url.origin;
}

class CookieJar {
  private readonly cookies = new Map<string, string>();

  store(setCookies: readonly string[]): void {
    for (const raw of setCookies) {
      const [pair = "", ...attributes] = raw.split(";");
      const eq = pair.indexOf("=");
      if (eq <= 0) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      const expired = attributes.some((attribute) => {
        const [key = "", val = ""] = attribute.split("=");
        const k = key.trim().toLowerCase();
        if (k === "max-age") return Number(val.trim()) <= 0;
        if (k === "expires") {
          const time = Date.parse(val.trim());
          return !Number.isNaN(time) && time <= Date.now();
        }
        return false;
      });
      if (expired || value === "") this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }

  header(): string | undefined {
    if (this.cookies.size === 0) return undefined;
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function mapHttpError(status: number, text: string): ApiError {
  const parsed = parseJson(text);
  const envelope =
    parsed && typeof parsed === "object"
      ? (parsed as { error?: { code?: unknown; message?: unknown } }).error
      : undefined;

  if (envelope && typeof envelope.code === "string") {
    const message =
      typeof envelope.message === "string" ? envelope.message : envelope.code;
    return new ApiError(message, envelope.code, status);
  }
  if (status === 403 && parsed === undefined && text.includes("1010")) {
    return new ApiError(
      "Cloudflare bloqueó la solicitud (error 1010, firma de cliente rechazada). Revise la URL o contacte al administrador de la plataforma.",
      "CLOUDFLARE_BLOCKED",
      status,
    );
  }
  if (status === 503) {
    return new ApiError(
      "Conflicto transitorio en el servidor (503). Puede reintentar la operación.",
      "SERVICE_UNAVAILABLE",
      status,
    );
  }
  return new ApiError(
    `Respuesta inesperada del servidor (HTTP ${status}).`,
    "UNEXPECTED_RESPONSE",
    status,
  );
}

function describeNetworkError(error: unknown, baseUrl: string): ApiError {
  if (error instanceof Error && error.name === "TimeoutError") {
    return new ApiError(
      `Tiempo de espera agotado al contactar ${baseUrl}.`,
      "NETWORK_ERROR",
    );
  }
  const cause = (error as { cause?: { code?: unknown } } | undefined)?.cause;
  const detail = typeof cause?.code === "string" ? ` (${cause.code})` : "";
  return new ApiError(
    `No se pudo conectar con ${baseUrl}${detail}. Revise su conexión y la URL.`,
    "NETWORK_ERROR",
  );
}

export function createHttpClient(config: HttpClientConfig): HttpClient {
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const doFetch = config.fetchImpl ?? fetch;
  const jar = new CookieJar();

  return {
    baseUrl,
    async request<T>(method: string, path: string, options: RequestOptions = {}) {
      const url = new URL(`${baseUrl}${API_PREFIX}${path}`);
      for (const [key, value] of Object.entries(options.query ?? {})) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }

      const headers: Record<string, string> = {
        Accept: "application/json",
        Origin: baseUrl,
        "User-Agent": config.userAgent,
      };
      const cookie = jar.header();
      if (cookie) headers["Cookie"] = cookie;
      if (options.body !== undefined) headers["Content-Type"] = "application/json";

      let response: Response;
      try {
        response = await doFetch(url, {
          method,
          headers,
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch (error) {
        throw describeNetworkError(error, baseUrl);
      }

      jar.store(response.headers.getSetCookie());
      const text = await response.text();
      if (!response.ok) throw mapHttpError(response.status, text);
      if (text === "") return undefined as T;
      const parsed = parseJson(text);
      if (parsed === undefined) {
        throw new ApiError(
          "El servidor respondió con un cuerpo que no es JSON.",
          "UNEXPECTED_RESPONSE",
          response.status,
        );
      }
      return parsed as T;
    },
  };
}
