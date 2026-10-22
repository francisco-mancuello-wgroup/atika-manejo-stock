// @vitest-environment node

import { priceLot } from "@atika/pricing";
import sharp from "sharp";
import { afterAll, describe, expect, it } from "vitest";
import {
  createFixtureLot,
  dbOver,
  disconnectTestDb,
  hasDatabase,
  withRollback,
} from "../../test/db";
import { memoryPhotoStorage } from "../../test/photo-storage";
import { createProduct, updateProduct } from "./save";

const params = {
  exchangeRate: 7000,
  saleFactor: 2.5,
  vatRate: 0.1,
  costRate: 0.5,
  totalShippingUsd: 20,
};

const form = (extra: Record<string, string> = {}) => ({
  name: "Vestido",
  originalValueUsd: "100",
  "sizes.0.size": "M",
  "sizes.0.unitsBought": "2",
  "sizes.0.stock": "2",
  ...extra,
});

const png = async () =>
  new Uint8Array(
    await sharp({
      create: { width: 20, height: 20, channels: 3, background: { r: 1, g: 2, b: 3 } },
    })
      .png()
      .toBuffer(),
  );

const MISSING = "00000000-0000-7000-8000-000000000000";

async function fixture(tx: Parameters<typeof createFixtureLot>[0]) {
  const { lot, products } = await createFixtureLot(tx, [
    { name: "A", originalValueUsd: 100, variants: [["M", 2, 2]] },
    { name: "B", originalValueUsd: 50, variants: [["M", 2, 2]] },
  ]);
  return { lot, a: products[0]?.id ?? "", b: products[1]?.id ?? "" };
}

describe.skipIf(!hasDatabase)("product edit and create (database)", () => {
  afterAll(disconnectTestDb);

  it("updates fields and variants, and prices with the formula using the new original value", async () => {
    await withRollback(async (tx) => {
      const { a, b } = await fixture(tx);
      const state = await updateProduct(
        dbOver(tx),
        a,
        form({
          code: "V-9",
          color: "Lila",
          category: "vestidos",
          originalValueUsd: "200",
          "sizes.0.size": "M",
          "sizes.0.unitsBought": "2",
          "sizes.0.stock": "1",
        }),
      );
      expect(state).toMatchObject({ status: "success" });
      const stored = await tx.product.findUniqueOrThrow({
        where: { id: a },
        include: { variants: true },
      });
      expect(stored).toMatchObject({
        code: "V-9",
        color: "Lila",
        category: "vestidos",
        name: "Vestido",
      });
      expect(stored.originalValueUsd.toNumber()).toBe(200);
      expect(stored.variants).toMatchObject([{ size: "M", unitsBought: 2, stock: 1 }]);
      const expected = priceLot(params, [
        { id: a, originalValueUsd: 200, units: 2 },
        { id: b, originalValueUsd: 50, units: 2 },
      ]);
      expect(stored.priceGs).toBe(expected[0]?.priceGs);
    });
  });

  it("renaming a product also renames it in the lookbook", async () => {
    await withRollback(async (tx) => {
      const { a } = await fixture(tx);
      await tx.product.update({ where: { id: a }, data: { catalogName: "Lookbook A" } });
      expect(await updateProduct(dbOver(tx), a, form({ name: "A nueva" }))).toMatchObject({
        status: "success",
      });
      const stored = await tx.product.findUniqueOrThrow({ where: { id: a } });
      expect(stored).toMatchObject({ name: "A nueva", catalogName: "A nueva" });
    });
  });

  it("keeps the lookbook name when the product name does not change", async () => {
    await withRollback(async (tx) => {
      const { a } = await fixture(tx);
      await tx.product.update({ where: { id: a }, data: { catalogName: "Lookbook A" } });
      expect(await updateProduct(dbOver(tx), a, form({ name: "A" }))).toMatchObject({
        status: "success",
      });
      const stored = await tx.product.findUniqueOrThrow({ where: { id: a } });
      expect(stored.catalogName).toBe("Lookbook A");
    });
  });

  it("reprices every product of the lot when units change", async () => {
    await withRollback(async (tx) => {
      const { a, b } = await fixture(tx);
      const before = await tx.product.findUniqueOrThrow({ where: { id: b } });
      await updateProduct(
        dbOver(tx),
        a,
        form({ "sizes.0.unitsBought": "6", "sizes.0.stock": "6" }),
      );
      const after = await tx.product.findUniqueOrThrow({ where: { id: b } });
      const expected = priceLot(params, [
        { id: a, originalValueUsd: 100, units: 6 },
        { id: b, originalValueUsd: 50, units: 2 },
      ]);
      expect(after.priceGs).toBe(expected[1]?.priceGs);
      expect(after.priceGs).not.toBe(before.priceGs);
    });
  });

  it("adds sizes and removes an unsold one", async () => {
    await withRollback(async (tx) => {
      const { a } = await fixture(tx);
      await updateProduct(
        dbOver(tx),
        a,
        form({ "sizes.1.size": "L", "sizes.1.unitsBought": "1", "sizes.1.stock": "1" }),
      );
      const withL = await tx.productVariant.findMany({ where: { productId: a } });
      expect(withL.map((v) => v.size).sort()).toEqual(["L", "M"]);

      expect(await updateProduct(dbOver(tx), a, form())).toMatchObject({ status: "success" });
      const withoutL = await tx.productVariant.findMany({ where: { productId: a } });
      expect(withoutL.map((v) => v.size)).toEqual(["M"]);
    });
  });

  it("refuses to remove a size that has sales, without writing anything", async () => {
    await withRollback(async (tx) => {
      const { a } = await fixture(tx);
      const variant = await tx.productVariant.findFirstOrThrow({ where: { productId: a } });
      await tx.sale.create({
        data: { variantId: variant.id, soldAt: new Date("2026-02-01"), listPriceGs: 1000 },
      });
      const state = await updateProduct(
        dbOver(tx),
        a,
        form({
          name: "Renamed",
          "sizes.0.size": "L",
          "sizes.0.unitsBought": "1",
          "sizes.0.stock": "1",
        }),
      );
      expect(state).toMatchObject({
        status: "error",
        fieldErrors: { sizes: "No se puede quitar un talle con ventas" },
      });
      expect((await tx.product.findUniqueOrThrow({ where: { id: a } })).name).toBe("A");
      const sizes = await tx.productVariant.findMany({ where: { productId: a } });
      expect(sizes.map((v) => v.size)).toEqual(["M"]);
    });
  });

  it("rejects invalid input and unknown products without writing", async () => {
    await withRollback(async (tx) => {
      const { a } = await fixture(tx);
      expect(await updateProduct(dbOver(tx), a, form({ "sizes.0.stock": "3" }))).toMatchObject({
        status: "error",
        fieldErrors: { "sizes.0.stock": expect.any(String) },
      });
      expect(
        await updateProduct(
          dbOver(tx),
          a,
          form({ "sizes.1.size": "M", "sizes.1.unitsBought": "1", "sizes.1.stock": "1" }),
        ),
      ).toMatchObject({ status: "error", fieldErrors: { "sizes.1.size": expect.any(String) } });
      expect((await tx.product.findUniqueOrThrow({ where: { id: a } })).name).toBe("A");
      expect(await updateProduct(dbOver(tx), MISSING, form())).toMatchObject({ status: "error" });
      expect(await updateProduct(dbOver(tx), "nope", form())).toMatchObject({ status: "error" });
    });
  });

  it("creates a hidden product in a lot with its sizes and reprices the lot", async () => {
    await withRollback(async (tx) => {
      const { lot, a } = await fixture(tx);
      const state = await createProduct(
        dbOver(tx),
        form({
          lotId: lot.id,
          code: "N-1",
          category: "tops",
          "sizes.1.size": "S",
          "sizes.1.unitsBought": "4",
          "sizes.1.stock": "4",
        }),
      );
      expect(state).toMatchObject({ status: "success", productId: expect.any(String) });
      const id = state.status === "success" && "productId" in state ? state.productId : "";
      const created = await tx.product.findUniqueOrThrow({
        where: { id },
        include: { variants: true },
      });
      expect(created).toMatchObject({
        lotId: lot.id,
        code: "N-1",
        category: "tops",
        isPublished: false,
      });
      expect(created.variants.map((v) => v.size).sort()).toEqual(["M", "S"]);
      const other = await tx.product.findUniqueOrThrow({ where: { id: a } });
      const expected = priceLot(params, [
        { id: a, originalValueUsd: 100, units: 2 },
        { id: "b", originalValueUsd: 50, units: 2 },
        { id, originalValueUsd: 100, units: 6 },
      ]);
      expect(created.priceGs).toBe(expected[2]?.priceGs);
      expect(other.priceGs).toBe(expected[0]?.priceGs);
    });
  });

  it("rejects creating without a size or in an unknown lot", async () => {
    await withRollback(async (tx) => {
      const { lot } = await fixture(tx);
      const count = await tx.product.count();
      expect(
        await createProduct(dbOver(tx), { lotId: lot.id, name: "X", originalValueUsd: "10" }),
      ).toMatchObject({ status: "error", fieldErrors: { sizes: expect.any(String) } });
      expect(await createProduct(dbOver(tx), form({ lotId: MISSING }))).toMatchObject({
        status: "error",
        fieldErrors: { lotId: expect.any(String) },
      });
      expect(await tx.product.count()).toBe(count);
    });
  });

  it("uploads photos as webp rows, first photo is the cover, and the cover can change", async () => {
    await withRollback(async (tx) => {
      const { a } = await fixture(tx);
      const { storage, files } = memoryPhotoStorage();
      const uploads = [
        { type: "image/png", bytes: await png() },
        { type: "image/png", bytes: await png() },
      ];
      const state = await updateProduct(dbOver(tx), a, form(), { uploads, storage });
      expect(state).toMatchObject({ status: "success" });
      const images = await tx.productImage.findMany({
        where: { productId: a },
        orderBy: { position: "asc" },
      });
      expect(images.map((i) => i.position)).toEqual([0, 1]);
      expect(files.size).toBe(2);
      for (const image of images) {
        expect(image.url.startsWith(`/media/products/uploads/${a}/`)).toBe(true);
        expect(files.has(image.url)).toBe(true);
      }

      const second = images[1]?.id ?? "";
      await updateProduct(dbOver(tx), a, form({ cover: second }), { storage });
      const reordered = await tx.productImage.findMany({
        where: { productId: a },
        orderBy: { position: "asc" },
      });
      expect(reordered.map((i) => i.id)).toEqual([second, images[0]?.id]);
      expect(reordered.map((i) => i.position)).toEqual([0, 1]);
    });
  });

  it("a new upload can be the cover", async () => {
    await withRollback(async (tx) => {
      const { a } = await fixture(tx);
      const { storage } = memoryPhotoStorage();
      const uploads = [
        { type: "image/png", bytes: await png() },
        { type: "image/png", bytes: await png() },
      ];
      await updateProduct(dbOver(tx), a, form({ cover: "new:1" }), { uploads, storage });
      const images = await tx.productImage.findMany({
        where: { productId: a },
        orderBy: { position: "asc" },
      });
      expect(images).toHaveLength(2);
      expect(images[0]?.url).toContain("-"); // the second upload (memory storage numbers files)
      expect(images[0]?.url.split("/").pop()?.startsWith("2-")).toBe(true);
    });
  });

  it("removes a photo row and deletes its uploaded file, keeping seeded files alone", async () => {
    await withRollback(async (tx) => {
      const { a } = await fixture(tx);
      const { storage, files } = memoryPhotoStorage();
      await updateProduct(dbOver(tx), a, form(), {
        uploads: [{ type: "image/png", bytes: await png() }],
        storage,
      });
      const seeded = await tx.productImage.create({
        data: { productId: a, url: "/media/products/casa-icona/x.webp", position: 5 },
      });
      const uploaded = await tx.productImage.findFirstOrThrow({
        where: { productId: a, NOT: { id: seeded.id } },
      });
      const state = await updateProduct(dbOver(tx), a, form(), {
        removePhotoIds: [uploaded.id, seeded.id],
        storage,
      });
      expect(state).toMatchObject({ status: "success" });
      expect(await tx.productImage.count({ where: { productId: a } })).toBe(0);
      expect(files.size).toBe(0);
    });
  });

  it("rejects an invalid photo without writing anything", async () => {
    await withRollback(async (tx) => {
      const { a } = await fixture(tx);
      const { storage, files } = memoryPhotoStorage();
      const state = await updateProduct(dbOver(tx), a, form({ name: "Renamed" }), {
        uploads: [{ type: "image/png", bytes: new TextEncoder().encode("nope") }],
        storage,
      });
      expect(state).toMatchObject({ status: "error", fieldErrors: { photos: expect.any(String) } });
      expect(files.size).toBe(0);
      expect((await tx.product.findUniqueOrThrow({ where: { id: a } })).name).toBe("A");
    });
  });

  it("creates a product with photos", async () => {
    await withRollback(async (tx) => {
      const { lot } = await fixture(tx);
      const { storage } = memoryPhotoStorage();
      const state = await createProduct(dbOver(tx), form({ lotId: lot.id }), {
        uploads: [{ type: "image/png", bytes: await png() }],
        storage,
      });
      const id = state.status === "success" && "productId" in state ? state.productId : "";
      const images = await tx.productImage.findMany({ where: { productId: id } });
      expect(images).toMatchObject([{ position: 0 }]);
      expect(images[0]?.url.startsWith(`/media/products/uploads/${id}/`)).toBe(true);
    });
  });
});
