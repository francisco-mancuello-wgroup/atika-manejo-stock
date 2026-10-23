import { describe, expect, it } from "vitest";
import { catalogHref, parseCatalogFilters } from "./filters";

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

  it("reads the brand slug and ignores the old lookbook param", () => {
    expect(parseCatalogFilters({ marca: "casa-icona" })).toEqual({
      status: "todos",
      brand: "casa-icona",
    });
    expect(parseCatalogFilters({ marca: ["milonga", "sordo"] })).toEqual({
      status: "todos",
      brand: "milonga",
    });
    expect(parseCatalogFilters({ catalogo: "casa-icona" })).toEqual({ status: "todos" });
  });
});

describe("catalogHref", () => {
  it("keeps the brand filter next to the status and search", () => {
    expect(catalogHref({ status: "visibles", query: "top", brand: "sordo" })).toBe(
      "/catalogo-web?estado=visibles&marca=sordo&q=top",
    );
    expect(catalogHref({ status: "todos" })).toBe("/catalogo-web");
  });
});
