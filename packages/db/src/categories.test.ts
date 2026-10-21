import { describe, expect, it } from "vitest";
import { CATALOG_CATEGORIES, findCatalogCategory, isCatalogCategory } from "./categories";

describe("catalog categories", () => {
  it("lists the storefront categories in display order", () => {
    expect(CATALOG_CATEGORIES.map((c) => c.slug)).toEqual([
      "vestidos",
      "tops",
      "faldas-y-shorts",
      "accesorios",
    ]);
    expect(CATALOG_CATEGORIES.map((c) => c.label)).toEqual([
      "Vestidos",
      "Tops",
      "Faldas y shorts",
      "Accesorios",
    ]);
  });

  it("finds a category by slug and recognises valid slugs only", () => {
    expect(findCatalogCategory("tops")?.label).toBe("Tops");
    expect(findCatalogCategory("zapatos")).toBeUndefined();
    expect(isCatalogCategory("accesorios")).toBe(true);
    expect(isCatalogCategory("novedades")).toBe(false);
    expect(isCatalogCategory(null)).toBe(false);
  });
});
