import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

function majorOf(packageName: string): number {
  const { version } = require(`${packageName}/package.json`) as { version: string };
  return Number(version.split(".")[0]);
}

// build/typecheck run TypeScript 7 through the `@typescript/native` alias, and
// typescript-eslint needs `typescript` to stay on 6 until it supports 7.
describe("toolchain", () => {
  it("compiles with TypeScript 7", () => {
    expect(majorOf("@typescript/native")).toBe(7);
  });

  it("lints with TypeScript 6", () => {
    expect(majorOf("typescript")).toBe(6);
  });
});
