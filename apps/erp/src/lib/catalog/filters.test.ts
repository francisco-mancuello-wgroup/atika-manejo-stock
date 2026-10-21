import { describe, expect, it } from "vitest";
import { parseCatalogFilters } from "./filters";

describe("parseCatalogFilters", () => {
  it("defaults to every product", () => {
    expect(parseCatalogFilters({})).toEqual({ status: "todos" });
  });

  it("reads the status and the trimmed search text", () => {
    expect(parseCatalogFilters({ estado: "visibles", q: "  vestido " })).toEqual({
      status: "visibles",
      query: "vestido",
    });
    expect(parseCatalogFilters({ estado: "sin-stock" })).toEqual({ status: "sin-stock" });
    expect(parseCatalogFilters({ estado: "ocultos" })).toEqual({ status: "ocultos" });
  });

  it("falls back safely on unknown or repeated values", () => {
    expect(parseCatalogFilters({ estado: "borrados" })).toEqual({ status: "todos" });
    expect(parseCatalogFilters({ estado: ["ocultos", "visibles"], q: ["a", "b"] })).toEqual({
      status: "ocultos",
      query: "a",
    });
    expect(parseCatalogFilters({ q: "   " })).toEqual({ status: "todos" });
  });
});
