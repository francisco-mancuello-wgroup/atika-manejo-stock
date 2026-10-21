import { describe, expect, it } from "vitest";
import { catalogHref, hasActiveFilters, parseCatalogFilters } from "./catalog-filters";

describe("parseCatalogFilters", () => {
  it("defaults to no filters, newest first", () => {
    expect(parseCatalogFilters({})).toEqual({ talle: null, q: null, orden: "recientes", p: null });
  });

  it("accepts known sizes (case-insensitive) and rejects the rest", () => {
    expect(parseCatalogFilters({ talle: "S" }).talle).toBe("S");
    expect(parseCatalogFilters({ talle: "xl" }).talle).toBe("XL");
    expect(parseCatalogFilters({ talle: "XS/S" }).talle).toBe("XS/S");
    expect(parseCatalogFilters({ talle: "XXL" }).talle).toBeNull();
    expect(parseCatalogFilters({ talle: "" }).talle).toBeNull();
  });

  it("trims the search text, caps its length and drops it when empty", () => {
    expect(parseCatalogFilters({ q: "  aros  " }).q).toBe("aros");
    expect(parseCatalogFilters({ q: "   " }).q).toBeNull();
    expect(parseCatalogFilters({ q: "x".repeat(200) }).q).toHaveLength(80);
  });

  it("accepts the known sort orders and falls back to newest first", () => {
    expect(parseCatalogFilters({ orden: "precio-asc" }).orden).toBe("precio-asc");
    expect(parseCatalogFilters({ orden: "precio-desc" }).orden).toBe("precio-desc");
    expect(parseCatalogFilters({ orden: "recientes" }).orden).toBe("recientes");
    expect(parseCatalogFilters({ orden: "azar" }).orden).toBe("recientes");
  });

  it("uses the first value of a repeated parameter and keeps the product id", () => {
    expect(parseCatalogFilters({ talle: ["M", "S"], p: "abc" })).toMatchObject({
      talle: "M",
      p: "abc",
    });
  });
});

describe("hasActiveFilters", () => {
  it("is true for a size or a search, not for sort or product", () => {
    expect(hasActiveFilters(parseCatalogFilters({}))).toBe(false);
    expect(hasActiveFilters(parseCatalogFilters({ orden: "precio-asc", p: "x" }))).toBe(false);
    expect(hasActiveFilters(parseCatalogFilters({ talle: "S" }))).toBe(true);
    expect(hasActiveFilters(parseCatalogFilters({ q: "aros" }))).toBe(true);
  });
});

describe("catalogHref", () => {
  const filters = parseCatalogFilters({ talle: "S", q: "aros", orden: "precio-asc", p: "id1" });

  it("keeps size, search and sort but drops the open product by default", () => {
    expect(catalogHref("vestidos", filters)).toBe(
      "/ver-todo/vestidos?talle=S&q=aros&orden=precio-asc",
    );
  });

  it("applies overrides, and omits defaults", () => {
    expect(catalogHref("tops", filters, { talle: null, orden: "recientes" })).toBe(
      "/ver-todo/tops?q=aros",
    );
    expect(catalogHref("novedades", parseCatalogFilters({}))).toBe("/ver-todo");
    expect(catalogHref("tops", filters, { p: "id2" })).toContain("p=id2");
  });

  it("encodes the sizes that contain a slash", () => {
    expect(catalogHref("tops", parseCatalogFilters({ talle: "XS/S" }))).toBe(
      "/ver-todo/tops?talle=XS%2FS",
    );
  });
});
