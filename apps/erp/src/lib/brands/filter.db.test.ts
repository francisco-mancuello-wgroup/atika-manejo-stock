// @vitest-environment node

import { ensureBrand } from "@atika/db/brands";
import { afterAll, describe, expect, it } from "vitest";
import { createFixtureLot, disconnectTestDb, hasDatabase, withRollback } from "../../test/db";
import { brandProductWhere, listBrandFilters } from "./filter";

describe.skipIf(!hasDatabase)("brand filter (database)", () => {
  afterAll(disconnectTestDb);

  async function setup(tx: Parameters<typeof createFixtureLot>[0]) {
    await tx.product.updateMany({ data: { brand: "Nobody" } });
    const filed = await ensureBrand(tx, "Filter A");
    const other = await ensureBrand(tx, "Filter B");
    const { products } = await createFixtureLot(tx, [
      { name: "In A", originalValueUsd: 10, variants: [["M", 1, 1]] },
      { name: "In A, other case", originalValueUsd: 10, variants: [["M", 1, 1]] },
      { name: "In B", originalValueUsd: 10, variants: [["M", 1, 1]] },
      { name: "No brand", originalValueUsd: 10, variants: [["M", 1, 1]] },
      { name: "Unregistered", originalValueUsd: 10, variants: [["M", 1, 1]] },
    ]);
    const [a, aCase, b, none, unknown] = products.map((p) => p.id);
    const set = (id: string | undefined, brand: string | null) =>
      tx.product.update({ where: { id: id ?? "" }, data: { brand } });
    await set(a, "Filter A");
    await set(aCase, "filter a");
    await set(b, "Filter B");
    await set(none, null);
    await set(unknown, "Never registered");
    return { filed, other, ids: { a, aCase, b, none, unknown } };
  }

  const names = async (tx: Parameters<typeof createFixtureLot>[0], slug: string) => {
    const where = await brandProductWhere(tx, slug);
    if (!where) return null;
    return (await tx.product.findMany({ where, select: { id: true } })).map((p) => p.id);
  };

  it("selects the products of a registered brand, ignoring case", async () => {
    await withRollback(async (tx) => {
      const { filed, other, ids } = await setup(tx);
      expect((await names(tx, filed.slug))?.sort()).toEqual([ids.a, ids.aCase].sort());
      expect(await names(tx, other.slug)).toEqual([ids.b]);
    });
  });

  it("sends products without a brand or with an unregistered one to Otras marcas", async () => {
    await withRollback(async (tx) => {
      const { ids } = await setup(tx);
      const fallback = await ensureBrand(tx, null);
      const found = await names(tx, fallback.slug);
      expect(found).toEqual(expect.arrayContaining([ids.none, ids.unknown]));
      expect(found).not.toContain(ids.a);
      expect(found).not.toContain(ids.b);
    });
  });

  it("knows no brand for an unknown slug", async () => {
    await withRollback(async (tx) => {
      expect(await brandProductWhere(tx, "no-such-brand")).toBeNull();
    });
  });

  it("lists every brand in order with its product count, Otras marcas last", async () => {
    await withRollback(async (tx) => {
      const { filed, other } = await setup(tx);
      const rows = await listBrandFilters(tx);
      const find = (slug: string) => rows.find((row) => row.slug === slug);
      expect(find(filed.slug)).toEqual({ slug: filed.slug, name: "Filter A", count: 2 });
      expect(find(other.slug)).toEqual({ slug: other.slug, name: "Filter B", count: 1 });
      const last = rows.at(-1);
      expect(last?.slug).toBe("otras-marcas");
      expect(last?.count).toBeGreaterThanOrEqual(2);
    });
  });
});
