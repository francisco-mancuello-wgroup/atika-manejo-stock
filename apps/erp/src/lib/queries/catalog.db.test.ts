import { ensureBrand } from "@atika/db/brands";
import { afterAll, describe, expect, it } from "vitest";
import { createFixtureLot, disconnectTestDb, hasDatabase, withRollback } from "../../test/db";
import { getDb } from "../db";
import { getCatalogBrandFilters, getCatalogProducts, getCatalogSettings } from "./catalog";

// Read-only checks against the local seeded database.
describe.skipIf(!hasDatabase)("catalog management queries (database)", () => {
  afterAll(async () => {
    await getDb().$disconnect();
    await disconnectTestDb();
  });

  it("lists products with available sizes only and filters by status and text", async () => {
    const all = await getCatalogProducts({ status: "todos" });
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((p) => p.sizes.every((s) => s.length > 0))).toBe(true);

    const soldOut = await getCatalogProducts({ status: "sin-stock" });
    expect(soldOut.every((p) => p.sizes.length === 0)).toBe(true);
    const visible = await getCatalogProducts({ status: "visibles" });
    const hidden = await getCatalogProducts({ status: "ocultos" });
    expect(visible.length + hidden.length).toBe(all.length);

    const first = all[0];
    const byText = await getCatalogProducts({ status: "todos", query: first?.name.slice(0, 4) });
    expect(byText.map((p) => p.id)).toContain(first?.id);
  });

  it("reads the catalog settings row", async () => {
    const settings = await getCatalogSettings();
    expect(settings.whatsappNumber.length).toBeGreaterThan(0);
    expect(typeof settings.showPrices).toBe("boolean");
  });

  it("flags the products that sit in an active group with its name", async () => {
    await withRollback(async (tx) => {
      const { products } = await createFixtureLot(tx, [
        { name: "Grouped q-hint", originalValueUsd: 10, variants: [["S", 5, 5]] },
        { name: "Plain q-hint", originalValueUsd: 10, variants: [["S", 5, 5]] },
      ]);
      const [grouped] = products;
      await tx.publicationGroup.create({
        data: {
          name: "Verano hint",
          isActive: true,
          allocations: {
            create: [{ variantId: grouped?.variants[0]?.id as string, allocated: 2 }],
          },
        },
      });
      const list = await getCatalogProducts({ status: "todos", query: "q-hint" }, tx);
      expect(list.map((p) => [p.name, p.groupName]).sort()).toEqual([
        ["Grouped q-hint", "Verano hint"],
        ["Plain q-hint", null],
      ]);
    });
  });

  it("filters by brand slug, with the fallback taking pieces without a registered brand", async () => {
    await withRollback(async (tx) => {
      const brand = await ensureBrand(tx, "Zq Brand");
      const fallback = await ensureBrand(tx, null);
      const { products } = await createFixtureLot(tx, [
        { name: "Branded q-brand", originalValueUsd: 10, variants: [["S", 5, 5]] },
        { name: "Loose q-brand", originalValueUsd: 10, variants: [["S", 5, 5]] },
        { name: "Unknown q-brand", originalValueUsd: 10, variants: [["S", 5, 5]] },
      ]);
      const [branded, loose, unknown] = products.map((p) => p.id);
      await tx.product.update({ where: { id: branded ?? "" }, data: { brand: "zq brand" } });
      await tx.product.update({ where: { id: loose ?? "" }, data: { brand: null } });
      await tx.product.update({ where: { id: unknown ?? "" }, data: { brand: "Nadie" } });
      const names = async (slug?: string) =>
        (await getCatalogProducts({ status: "todos", query: "q-brand", brand: slug }, tx))
          .map((p) => p.name)
          .sort();
      expect(await names()).toHaveLength(3);
      expect(await names(brand.slug)).toEqual(["Branded q-brand"]);
      expect(await names(fallback.slug)).toEqual(["Loose q-brand", "Unknown q-brand"]);
      // An unknown slug (an old bookmark) filters nothing
      expect(await names("no-such-brand")).toHaveLength(3);
    });
  });

  it("offers a filter link per brand with its product count", async () => {
    await withRollback(async (tx) => {
      const brand = await ensureBrand(tx, "Zq Count");
      const { products } = await createFixtureLot(tx, [
        { name: "Counted", originalValueUsd: 10, variants: [["S", 5, 5]] },
      ]);
      await tx.product.update({
        where: { id: products[0]?.id ?? "" },
        data: { brand: "Zq Count" },
      });
      const links = await getCatalogBrandFilters(tx);
      expect(links.find((link) => link.slug === brand.slug)).toEqual({
        slug: brand.slug,
        name: "Zq Count",
        count: 1,
      });
      expect(links.at(-1)?.slug).toBe("otras-marcas");
    });
  });
});
