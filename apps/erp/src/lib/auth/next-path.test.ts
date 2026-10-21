import { describe, expect, it } from "vitest";
import { safeNextPath } from "./next-path";

describe("safeNextPath", () => {
  it("keeps same-origin relative paths with query", () => {
    expect(safeNextPath("/inventario")).toBe("/inventario");
    expect(safeNextPath("/compras/abc?x=1#y")).toBe("/compras/abc?x=1#y");
  });

  it.each([
    undefined,
    "",
    "inventario",
    "//evil.test",
    "/\\evil.test",
    "https://evil.test",
    "javascript:alert(1)",
    "/ok\nSet-Cookie: a=b",
    "/ok\\..\\x",
    "/login",
    "/login?next=/",
  ])("falls back to / for %j", (value) => {
    expect(safeNextPath(value)).toBe("/");
  });
});
