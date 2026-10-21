import { afterAll, describe, expect, it } from "vitest";
import {
  createFixtureLot,
  dbOver,
  disconnectTestDb,
  hasDatabase,
  withRollback,
} from "../../test/db";
import {
  publishAllInStock,
  saveCatalogSettings,
  setProductCategory,
  setProductVisibility,
} from "./save";

const form = {
  whatsappNumber: "+595 981 123 456",
  messageTemplate: "Hola! {producto} talle {talle}",
  heroText: "Hero",
  showSoldOutSizes: "on",
};

describe.skipIf(!hasDatabase)("catalog management (database)", () => {
  afterAll(disconnectTestDb);

  it("saves the catalog settings", async () => {
    await withRollback(async (tx) => {
      const state = await saveCatalogSettings(dbOver(tx), form);
      expect(state).toMatchObject({ status: "success" });
      const row = await tx.catalogSettings.findUniqueOrThrow({ where: { id: 1 } });
      expect(row).toMatchObject({
        whatsappNumber: "+595 981 123 456",
        heroText: "Hero",
        showPrices: false,
        showSoldOutSizes: true,
        hideOutOfStock: false,
      });
    });
  });

  it("rejects invalid settings without writing", async () => {
    await withRollback(async (tx) => {
      const before = await tx.catalogSettings.findUnique({ where: { id: 1 } });
      const state = await saveCatalogSettings(dbOver(tx), { ...form, whatsappNumber: "1" });
      expect(state).toMatchObject({
        status: "error",
        fieldErrors: { whatsappNumber: expect.any(String) },
      });
      expect(await tx.catalogSettings.findUnique({ where: { id: 1 } })).toEqual(before);
    });
  });

  it("toggles visibility and sets the category of one product", async () => {
    await withRollback(async (tx) => {
      const { products } = await createFixtureLot(tx, [
        { name: "A", originalValueUsd: 10, variants: [["M", 1, 1]] },
      ]);
      const id = products[0]?.id ?? "";
      expect(await setProductVisibility(dbOver(tx), id, true)).toMatchObject({ status: "success" });
      expect(await setProductCategory(dbOver(tx), id, "vestidos")).toMatchObject({
        status: "success",
      });
      const stored = await tx.product.findUniqueOrThrow({ where: { id } });
      expect(stored).toMatchObject({ isPublished: true, category: "vestidos" });

      await setProductCategory(dbOver(tx), id, "");
      expect((await tx.product.findUniqueOrThrow({ where: { id } })).category).toBeNull();
    });
  });

  it("refuses unknown categories and unknown products", async () => {
    await withRollback(async (tx) => {
      const { products } = await createFixtureLot(tx, [
        { name: "A", originalValueUsd: 10, variants: [["M", 1, 1]] },
      ]);
      const id = products[0]?.id ?? "";
      expect(await setProductCategory(dbOver(tx), id, "zapatos")).toMatchObject({
        status: "error",
      });
      expect((await tx.product.findUniqueOrThrow({ where: { id } })).category).toBeNull();
      const missing = "00000000-0000-7000-8000-000000000000";
      expect(await setProductVisibility(dbOver(tx), missing, true)).toMatchObject({
        status: "error",
      });
      expect(await setProductVisibility(dbOver(tx), "nope", true)).toMatchObject({
        status: "error",
      });
    });
  });

  it("publishes only products that have stock", async () => {
    await withRollback(async (tx) => {
      await tx.product.updateMany({ data: { isPublished: false } });
      const { products } = await createFixtureLot(tx, [
        { name: "With stock", originalValueUsd: 10, variants: [["M", 2, 1]] },
        { name: "Sold out", originalValueUsd: 10, variants: [["M", 2, 0]] },
      ]);
      const state = await publishAllInStock(dbOver(tx));
      expect(state).toMatchObject({ status: "success" });
      const [withStock, soldOut] = await Promise.all(
        products.map((p) => tx.product.findUniqueOrThrow({ where: { id: p.id } })),
      );
      expect(withStock?.isPublished).toBe(true);
      expect(soldOut?.isPublished).toBe(false);
    });
  });
});
