import { describe, expect, it } from "vitest";
import { CATEGORIES, findCategory } from "./categories";

describe("catalog categories", () => {
  it("puts Novedades first and then the shared product categories", () => {
    expect(CATEGORIES.map((c) => c.slug)).toEqual([
      "novedades",
      "vestidos",
      "tops",
      "faldas-y-shorts",
      "accesorios",
    ]);
  });

  it("finds a category by slug", () => {
    expect(findCategory("tops")?.label).toBe("Tops");
    expect(findCategory("zapatos")).toBeUndefined();
  });
});
