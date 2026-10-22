import { afterAll, describe, expect, it } from "vitest";
import { disconnectTestDb, hasDatabase, testDb } from "../../test/db";
import { getDb } from "../db";
import { getInventory, getLotOptions } from "./inventory";
import { getLotDetail, getLotSummaries, getLotsForPricingPreview } from "./lots";
import { getLatestSales, getSellableProducts } from "./sales";
import { getResumen } from "./summary";

// Read-only smoke tests against the local seeded database.
describe.skipIf(!hasDatabase)("read queries (database)", () => {
  afterAll(async () => {
    await getDb().$disconnect();
    await disconnectTestDb();
  });

  it("returns plain numbers, never Decimal objects", async () => {
    const [lot] = await getLotSummaries();
    expect(lot).toBeDefined();
    expect(typeof lot?.exchangeRate).toBe("number");
    expect(typeof lot?.investmentUsd).toBe("number");

    const detail = lot ? await getLotDetail(lot.id) : null;
    expect(typeof detail?.params.exchangeRate).toBe("number");
    expect(typeof detail?.rows[0]?.originalValueUsd).toBe("number");
  });

  it("lists every lot with shipping and products priced for the settings preview", async () => {
    const lots = await getLotsForPricingPreview();
    const summaries = await getLotSummaries();
    expect(lots).toHaveLength(summaries.length);
    const [first] = lots;
    expect(first).toEqual({
      id: expect.any(String),
      name: expect.any(String),
      pricingMode: expect.stringMatching(/^(global|custom)$/),
      totalShippingUsd: expect.any(Number),
      products: expect.any(Array),
    });
    const detail = first ? await getLotDetail(first.id) : null;
    expect(first?.products).toHaveLength(detail?.rows.length ?? -1);
    const [product] = first?.products ?? [];
    expect(product).toEqual({
      id: expect.any(String),
      name: expect.any(String),
      originalValueUsd: expect.any(Number),
      unitsBought: expect.any(Number),
      priceGs: expect.any(Number),
    });
    const row = detail?.rows.find((r) => r.id === product?.id);
    expect(first?.products.reduce((sum, p) => sum + p.unitsBought, 0)).toBe(
      detail?.summary.unitsBought,
    );
    expect(product?.priceGs).toBe(row?.priceGs);
  });

  it("filters the inventory by lot and by text", async () => {
    const [lot] = await getLotOptions();
    const all = await getInventory({});
    const byLot = await getInventory({ lotId: lot?.id });
    expect(byLot.length).toBeGreaterThan(0);
    expect(byLot.length).toBeLessThan(all.length);
    expect(byLot.every((p) => p.lotId === lot?.id)).toBe(true);

    const first = all[0];
    const byText = await getInventory({ query: first?.name.slice(0, 4).toUpperCase() });
    expect(byText.map((p) => p.id)).toContain(first?.id);
    expect(await getInventory({ query: "zzz-no-such-product" })).toEqual([]);
    expect(await getInventory({ lotId: "not-a-uuid" })).toHaveLength(all.length);
  });

  it("finds a product by the exact barcode of one of its sizes, trimmed and case-insensitive", async () => {
    const variant = await testDb().productVariant.findFirstOrThrow({
      select: { barcode: true, productId: true },
    });
    for (const query of [variant.barcode, ` ${variant.barcode.toLowerCase()} `]) {
      const found = await getInventory({ query });
      expect(found.map((p) => p.id)).toEqual([variant.productId]);
    }
    // Only the whole code matches: a prefix must not surface unrelated products.
    const prefix = await getInventory({ query: variant.barcode.slice(0, -1) });
    expect(prefix.map((p) => p.id)).not.toContain(variant.productId);
  });

  it("offers only products with sizes in stock for the sale form", async () => {
    const sellable = await getSellableProducts();
    expect(sellable.length).toBeGreaterThan(0);
    expect(sellable.every((p) => p.sizes.length > 0 && p.sizes.every((s) => s.stock > 0))).toBe(
      true,
    );
  });

  it("builds the summary with the latest sales newest first", async () => {
    const resumen = await getResumen();
    expect(resumen.totals.stock).toBeGreaterThan(0);
    const dates = (await getLatestSales(5)).map((s) => s.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });
});
