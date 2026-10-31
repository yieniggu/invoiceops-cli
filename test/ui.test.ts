import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../src/http/errors.js";
import { reportError } from "../src/ui.js";

vi.mock("@clack/prompts", () => ({
  log: { error: vi.fn(), warn: vi.fn() },
  isCancel: () => false,
}));

const { log } = await import("@clack/prompts");

afterEach(() => vi.clearAllMocks());

function reported(error: unknown): string {
  reportError(error);
  return String(vi.mocked(log.error).mock.calls[0]?.[0]);
}

describe("reportError", () => {
  it("adds the administrator hint only for FORBIDDEN", () => {
    const text = reported(new ApiError("Forbidden", "FORBIDDEN", 403));
    expect(text).toContain("[FORBIDDEN]");
    expect(text).toContain("administrador de la plataforma");
  });

  it("points FORBIDDEN_ORIGIN at the URL / PUBLIC_ORIGIN", () => {
    const text = reported(new ApiError("Origin not allowed", "FORBIDDEN_ORIGIN", 403));
    expect(text).toContain("INVOICEOPS_URL");
    expect(text).toContain("PUBLIC_ORIGIN");
    expect(text).not.toContain("administrador de la plataforma");
  });

  it.each(["CLOUDFLARE_BLOCKED", "ONBOARDING_REQUIRED", "USER_CONFLICT"])(
    "adds no hint for %s",
    (code) => {
      const text = reported(new ApiError("msg", code, 403));
      expect(text).toBe(`msg [${code}]`);
    },
  );
});
