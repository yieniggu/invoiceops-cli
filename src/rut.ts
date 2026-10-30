// Client-side mirror of the backend RUT rules (the server stays authoritative).
const RUT_PATTERN = /^([1-9]\d{6,7}|[1-9]\d?(?:\.\d{3}){2})-?([0-9Kk])$/;

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
  if (typeof input !== "string") return null;
  const match = RUT_PATTERN.exec(input.trim());
  if (!match?.[1] || !match[2]) return null;
  const body = match[1].replaceAll(".", "");
  const dv = match[2].toUpperCase();
  return dv === verificationDigitFor(body) ? `${body}${dv}` : null;
}

export function isValidRut(input: unknown): boolean {
  return canonicalRut(input) !== null;
}
