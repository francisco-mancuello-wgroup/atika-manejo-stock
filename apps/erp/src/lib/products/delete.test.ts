// @vitest-environment node

import { afterAll, describe, expect, it } from "vitest";
import {
  createFixtureLot,
  dbOver,
  disconnectTestDb,
  hasDatabase,
  withRollback,
} from "../../test/db";
import { memoryPhotoStorage } from "../../test/photo-storage";
import { deleteProduct, deletionBlock } from "./delete";

const MISSING = "00000000-0000-7000-8000-000000000000";

async function fixture(tx: Parameters<typeof createFixtureLot>[0]) {
  const { lot, products } = await createFixtureLot(tx, [
    { name: "A", originalValueUsd: 100, variants: [["M", 2, 2]] },
    { name: "B", originalValueUsd: 50, variants: [["M", 2, 2]] },
  ]);
  const [a, b] = products;
  return { lot, a: a?.id ?? "", b: b?.id ?? "", variantA: a?.variants[0]?.id ?? "" };
}

describe.skipIf(!hasDatabase)("deleteProduct (database)", () => {
  afterAll(disconnectTestDb);

  it("rejects an invalid or unknown id", async () => {
    await withRollback(async (tx) => {
      for (const id of ["nope", MISSING]) {
        expect(await deleteProduct(dbOver(tx), id)).toEqual({
          status: "error",
          message: "No se encontró el producto.",
        });
      }
    });
  });

  it("deletes the product with its variants, photos, discount and bank promo links, and reprices the lot", async () => {
    await withRollback(async (tx) => {
      const { a, b } = await fixture(tx);
      await tx.productImage.createMany({
        data: [
          { productId: a, url: "/media/products/uploads/x/1.webp", position: 0 },
          { productId: a, url: "/media/products/seed/2.webp", position: 1 },
        ],
      });
      const discount = await tx.discount.create({
        data: { name: "D", percent: 10, scope: "selected" },
      });
      await tx.discountProduct.create({ data: { discountId: discount.id, productId: a } });
      const { storage, files } = memoryPhotoStorage();
      files.set("/media/products/uploads/x/1.webp", new Uint8Array([1]));

      const result = await deleteProduct(dbOver(tx), a, storage);

      expect(result).toEqual({ status: "success", name: "A" });
      expect(await tx.product.findUnique({ where: { id: a } })).toBeNull();
      expect(await tx.productVariant.count({ where: { productId: a } })).toBe(0);
      expect(await tx.productImage.count({ where: { productId: a } })).toBe(0);
      expect(await tx.discountProduct.count({ where: { productId: a } })).toBe(0);
      expect(files.has("/media/products/uploads/x/1.webp")).toBe(false);
      expect(await tx.product.findUnique({ where: { id: b } })).not.toBeNull();
    });
  });

  it("removes unsold group allocations", async () => {
    await withRollback(async (tx) => {
      const { a, variantA } = await fixture(tx);
      const group = await tx.publicationGroup.create({ data: { name: "G" } });
      await tx.groupAllocation.create({
        data: { groupId: group.id, variantId: variantA, allocated: 2, sold: 0 },
      });
      expect(await deleteProduct(dbOver(tx), a)).toMatchObject({ status: "success" });
      expect(await tx.groupAllocation.count({ where: { variantId: variantA } })).toBe(0);
      expect(await tx.publicationGroup.count({ where: { id: group.id } })).toBe(1);
    });
  });

  it("refuses when a variant has sales and changes nothing", async () => {
    await withRollback(async (tx) => {
      const { a, variantA } = await fixture(tx);
      await tx.sale.create({
        data: { variantId: variantA, soldAt: new Date("2026-02-01"), listPriceGs: 1000 },
      });
      const result = await deleteProduct(dbOver(tx), a);
      expect(result).toEqual({
        status: "error",
        message: "No se puede eliminar: el producto tiene ventas.",
      });
      expect(await tx.product.findUnique({ where: { id: a } })).not.toBeNull();
      expect(await deletionBlock(tx, a)).toBe("sales");
    });
  });

  it("refuses when a group allocation already sold units", async () => {
    await withRollback(async (tx) => {
      const { a, variantA } = await fixture(tx);
      const group = await tx.publicationGroup.create({ data: { name: "G" } });
      await tx.groupAllocation.create({
        data: { groupId: group.id, variantId: variantA, allocated: 2, sold: 1 },
      });
      expect(await deleteProduct(dbOver(tx), a)).toMatchObject({ status: "error" });
      expect(await tx.product.findUnique({ where: { id: a } })).not.toBeNull();
    });
  });

  it("refuses when a web order references a variant", async () => {
    await withRollback(async (tx) => {
      const { a, variantA } = await fixture(tx);
      const order = await tx.order.create({ data: {} });
      await tx.orderItem.create({
        data: {
          orderId: order.id,
          variantId: variantA,
          quantity: 1,
          unitPriceGs: 1000,
          productName: "A",
          size: "M",
        },
      });
      expect(await deleteProduct(dbOver(tx), a)).toEqual({
        status: "error",
        message: "No se puede eliminar: el producto tiene ventas o pedidos.",
      });
    });
  });

  it("reports no block for a clean product", async () => {
    await withRollback(async (tx) => {
      const { a } = await fixture(tx);
      expect(await deletionBlock(tx, a)).toBeNull();
    });
  });
});
