import { describe, expect, it } from "vitest";

import {
  canonicalRut,
  displayRut,
  formatRut,
  rutPromptError,
  toApiRut,
} from "../src/rut.js";

describe("rut", () => {
  it.each(["11.111.111-1", "11111111-1", "111111111", " 11 111 111 1 ", "11.111.1111"])(
    "accepts the lenient spelling %j",
    (input) => {
      expect(canonicalRut(input)).toBe("111111111");
    },
  );

  it("normalizes a lowercase K", () => {
    expect(canonicalRut("10.000.013-k")).toBe("10000013K");
  });

  it("formats for the API and for display", () => {
    expect(toApiRut("111111111")).toBe("11111111-1");
    expect(formatRut("111111111")).toBe("11.111.111-1");
    expect(formatRut("1000000-9")).toBe("1.000.000-9");
  });

  it("explains why a RUT is rejected", () => {
    expect(rutPromptError("11.111.111-1")).toBeUndefined();
    expect(rutPromptError("11.111.111-2")).toBe("Dígito verificador incorrecto");
    expect(rutPromptError("123-4")).toBe(
      "Debe tener 7 u 8 dígitos más el dígito verificador",
    );
    expect(rutPromptError("11a111111")).toBe(
      "Solo dígitos, K, puntos, guion o espacios",
    );
  });
});

describe("displayRut", () => {
  it("formats valid input and returns invalid input untouched", () => {
    expect(displayRut("111111111")).toBe("11.111.111-1");
    expect(displayRut("not a rut")).toBe("not a rut");
    expect(displayRut("11.111.111-2")).toBe("11.111.111-2");
  });
});
