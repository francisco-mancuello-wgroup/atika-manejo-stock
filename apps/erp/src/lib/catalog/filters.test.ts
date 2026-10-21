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

  it("reads the lookbook filter and ignores unknown catalogs", () => {
    expect(parseCatalogFilters({ catalogo: "casa-icona" })).toEqual({
      status: "todos",
      catalog: "casa-icona",
    });
    expect(parseCatalogFilters({ catalogo: "ninguno" })).toEqual({
      status: "todos",
      catalog: "ninguno",
    });
    expect(parseCatalogFilters({ catalogo: "verano" })).toEqual({ status: "todos" });
  });
});

describe("catalogHref", () => {
  it("keeps the lookbook filter next to the status and search", () => {
    expect(catalogHref({ status: "visibles", query: "top", catalog: "sordo" })).toBe(
      "/catalogo-web?estado=visibles&catalogo=sordo&q=top",
    );
    expect(catalogHref({ status: "todos" })).toBe("/catalogo-web");
  });
});
