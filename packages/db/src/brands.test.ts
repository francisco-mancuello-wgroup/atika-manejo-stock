import { describe, expect, it } from "vitest";
import {
  brandKey,
  brandSlug,
  FALLBACK_BRAND_NAME,
  FALLBACK_BRAND_SLUG,
  resolveBrand,
} from "./brands";

describe("brandKey", () => {
  it("compares brands without case or surrounding spaces", () => {
    expect(brandKey("  Casa Icona ")).toBe("casa icona");
    expect(brandKey("MILONGA")).toBe(brandKey("milonga"));
  });

  it("is empty for a missing or blank brand", () => {
    expect(brandKey(null)).toBe("");
    expect(brandKey(undefined)).toBe("");
    expect(brandKey("   ")).toBe("");
  });
});

describe("brandSlug", () => {
  it("is an accent-free kebab case", () => {
    expect(brandSlug("Zunilda Gutierrez")).toBe("zunilda-gutierrez");
    expect(brandSlug("Casa Icona")).toBe("casa-icona");
    expect(brandSlug("Átika  & Ñandú!")).toBe("atika-nandu");
  });

  it("never takes a route that already exists under /catalogos", () => {
    expect(brandSlug("Pink")).toBe("pink-marca");
    expect(brandSlug("Todos")).toBe("todos-marca");
  });

  it("falls back to a generic slug when nothing is left", () => {
    expect(brandSlug("***")).toBe("marca");
  });

  it("names the fallback brand", () => {
    expect(FALLBACK_BRAND_NAME).toBe("Otras marcas");
    expect(FALLBACK_BRAND_SLUG).toBe(brandSlug(FALLBACK_BRAND_NAME));
  });
});

describe("resolveBrand", () => {
  const brands = [
    { key: "milonga", isFallback: false, id: "m" },
    { key: "otras marcas", isFallback: true, id: "f" },
  ];

  it("finds a brand by its name, ignoring case and spaces", () => {
    expect(resolveBrand(" MILONGA ", brands)?.id).toBe("m");
  });

  it("sends a missing, blank or unknown brand to the fallback", () => {
    expect(resolveBrand(null, brands)?.id).toBe("f");
    expect(resolveBrand("  ", brands)?.id).toBe("f");
    expect(resolveBrand("Baobab", brands)?.id).toBe("f");
  });

  it("is null when there is no fallback to land on", () => {
    expect(resolveBrand("Baobab", brands.slice(0, 1))).toBeNull();
  });
});
