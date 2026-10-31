// Client-side mirror of the backend RUT rules (the server stays authoritative).
// Input is lenient: dots, dashes and spaces are ignored anywhere, so
// "12345678-5", "12.345.678-5", "123456785" and "12 345 678 5" are all
// accepted and normalized before reaching the API.
const ALLOWED_CHARACTERS = /^[\d.\-\sKk]+$/;
const CANONICAL_PATTERN = /^([1-9]\d{6,7})([0-9K])$/;

function verificationDigitFor(body: string): string {
  let sum = 0;
  let multiplier = 2;
  for (const digit of [...body].reverse()) {
    sum += Number(digit) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = sum % 11;
  return remainder === 0 ? "0" : remainder === 1 ? "K" : String(11 - remainder);
}

/** Returns the canonical form (digits + DV, uppercase K) or null when invalid. */
export function canonicalRut(input: unknown): string | null {
  if (typeof input !== "string" || !ALLOWED_CHARACTERS.test(input)) return null;
  const compact = input.replace(/[.\-\s]/g, "").toUpperCase();
  const match = CANONICAL_PATTERN.exec(compact);
  if (!match?.[1] || !match[2]) return null;
  return match[2] === verificationDigitFor(match[1]) ? compact : null;
}

export function isValidRut(input: unknown): boolean {
  return canonicalRut(input) !== null;
}

function split(input: string): [string, string] {
  const canonical = canonicalRut(input);
  if (canonical === null) throw new Error(`Invalid RUT: ${input}`);
  return [canonical.slice(0, -1), canonical.slice(-1)];
}

/** API form accepted by the backend: "12345678-5". */
export function toApiRut(input: string): string {
  const [body, dv] = split(input);
  return `${body}-${dv}`;
}

/** Display form: "12.345.678-5". */
export function formatRut(input: string): string {
  const [body, dv] = split(input);
  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${dv}`;
}

/** Display form that never throws: falls back to the raw text when invalid. */
export function displayRut(input: string): string {
  return isValidRut(input) ? formatRut(input) : input;
}

/** Prompt validator: explains what is wrong instead of a bare "invalid". */
export function rutPromptError(input: string | undefined): string | undefined {
  const value = input ?? "";
  if (isValidRut(value)) return undefined;
  if (!ALLOWED_CHARACTERS.test(value)) {
    return "Solo dígitos, K, puntos, guion o espacios";
  }
  const compact = value.replace(/[.\-\s]/g, "").toUpperCase();
  return CANONICAL_PATTERN.test(compact)
    ? "Dígito verificador incorrecto"
    : "Debe tener 7 u 8 dígitos más el dígito verificador";
}
