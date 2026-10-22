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
  saveProductLookbook,
  setProductCategory,
  setProductsVisibility,
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

  it("shows or hides every listed product at once, including those without stock", async () => {
    await withRollback(async (tx) => {
      const { products } = await createFixtureLot(tx, [
        { name: "With stock", originalValueUsd: 10, variants: [["M", 2, 1]] },
        { name: "Sold out", originalValueUsd: 10, variants: [["M", 2, 0]] },
      ]);
      const ids = products.map((p) => p.id);

      expect(await setProductsVisibility(dbOver(tx), ids, true)).toMatchObject({
        status: "success",
        message: "Se hicieron visibles 2 productos.",
      });
      const shown = await tx.product.findMany({ where: { id: { in: ids } } });
      expect(shown.every((p) => p.isPublished)).toBe(true);

      expect(await setProductsVisibility(dbOver(tx), ids, false)).toMatchObject({
        status: "success",
        message: "Se ocultaron 2 productos.",
      });
      const hidden = await tx.product.findMany({ where: { id: { in: ids } } });
      expect(hidden.every((p) => !p.isPublished)).toBe(true);
    });
  });

  it("ignores malformed ids and rejects an empty selection", async () => {
    await withRollback(async (tx) => {
      expect(await setProductsVisibility(dbOver(tx), [], true)).toMatchObject({ status: "error" });
      expect(await setProductsVisibility(dbOver(tx), ["nope"], true)).toMatchObject({
        status: "error",
      });
    });
  });

  it("saves the lookbook placement without touching the formula price", async () => {
    await withRollback(async (tx) => {
      const { products } = await createFixtureLot(tx, [
        { name: "A", originalValueUsd: 10, priceGs: 12_000, variants: [["M", 1, 1]] },
      ]);
      const id = products[0]?.id ?? "";
      const state = await saveProductLookbook(dbOver(tx), {
        productId: id,
        catalog: "sordo",
        catalogOrder: "3",
        catalogSection: "Aros",
        catalogName: "Cubagua",
      });
      expect(state).toMatchObject({ status: "success", message: "Guardado." });
      const stored = await tx.product.findUniqueOrThrow({ where: { id } });
      expect(stored).toMatchObject({
        catalog: "sordo",
        catalogOrder: 3,
        catalogSection: "Aros",
        catalogName: "Cubagua",
        name: "A",
        priceGs: 12_000,
      });
    });
  });

  it("rejects invalid lookbook fields and unknown products without writing", async () => {
    await withRollback(async (tx) => {
      const { products } = await createFixtureLot(tx, [
        { name: "A", originalValueUsd: 10, variants: [["M", 1, 1]] },
      ]);
      const id = products[0]?.id ?? "";
      expect(
        await saveProductLookbook(dbOver(tx), { productId: id, catalogOrder: "0" }),
      ).toMatchObject({ status: "error", fieldErrors: { catalogOrder: expect.any(String) } });
      expect((await tx.product.findUniqueOrThrow({ where: { id } })).catalogOrder).toBeNull();
      expect(
        await saveProductLookbook(dbOver(tx), {
          productId: "00000000-0000-7000-8000-000000000000",
        }),
      ).toMatchObject({ status: "error" });
    });
  });
});
