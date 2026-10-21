import { afterAll, describe, expect, it } from "vitest";
import { createProducts, disconnectTestDb, hasDatabase, withRollback } from "../test/db";
import {
  countProductsByCategory,
  getCatalogSettings,
  getProduct,
  getProductDetail,
  listProducts,
} from "./queries";

const noFilters = { talle: null, q: null, orden: "recientes" as const, p: null };
const open = { showPrices: true, showSoldOutSizes: false, hideOutOfStock: true };

describe.skipIf(!hasDatabase)("catalog queries (database)", () => {
  afterAll(disconnectTestDb);

  it("lists only published products, newest first", async () => {
    await withRollback(async (tx) => {
      await tx.product.updateMany({ data: { isPublished: false } });
      await createProducts(tx, [
        { name: "Old", variants: [["M", 1]] },
        { name: "Hidden", isPublished: false, variants: [["M", 1]] },
        { name: "New", variants: [["M", 1]] },
      ]);
      const products = await listProducts(tx, open, null);
      expect(products.map((p) => p.name)).toEqual(["New", "Old"]);
    });
  });

  it("honors hideOutOfStock", async () => {
    await withRollback(async (tx) => {
      await tx.product.updateMany({ data: { isPublished: false } });
      await createProducts(tx, [
        { name: "In", variants: [["M", 1]] },
        { name: "Out", variants: [["M", 0]] },
      ]);
      expect((await listProducts(tx, open, null)).map((p) => p.name)).toEqual(["In"]);
      const shown = await listProducts(tx, { ...open, hideOutOfStock: false }, null);
      expect(shown.map((p) => p.name).sort()).toEqual(["In", "Out"]);
    });
  });

  it("filters by category", async () => {
    await withRollback(async (tx) => {
      await tx.product.updateMany({ data: { isPublished: false } });
      await createProducts(tx, [
        { name: "Dress", category: "vestidos", variants: [["M", 1]] },
        { name: "Top", category: "tops", variants: [["M", 1]] },
      ]);
      expect((await listProducts(tx, open, "vestidos")).map((p) => p.name)).toEqual(["Dress"]);
      expect(await listProducts(tx, open, "accesorios")).toEqual([]);
    });
  });

  it("returns catalog-safe products and hides unpublished ones from the product page", async () => {
    await withRollback(async (tx) => {
      const [visible, hidden] = await createProducts(tx, [
        { name: "Seen", variants: [["S", 2]] },
        { name: "Unseen", isPublished: false, variants: [["S", 2]] },
      ]);
      const product = await getProduct(tx, open, visible ?? "");
      expect(product?.name).toBe("Seen");
      expect(Object.keys(product ?? {}).sort()).toEqual([
        "brand",
        "category",
        "detail",
        "id",
        "imageUrl",
        "inStock",
        "name",
        "priceGs",
        "sizes",
      ]);
      expect(await getProduct(tx, open, hidden ?? "")).toBeNull();
      expect(await getProduct(tx, open, "not-a-uuid")).toBeNull();
      expect(await getProduct(tx, open, "00000000-0000-7000-8000-000000000000")).toBeNull();
    });
  });

  it("exposes the cover photo URL only", async () => {
    await withRollback(async (tx) => {
      const [id] = await createProducts(tx, [{ name: "Photo", variants: [["S", 1]] }]);
      await tx.productImage.createMany({
        data: [
          { productId: id ?? "", url: "/media/products/x/second.webp", alt: "s", position: 1 },
          { productId: id ?? "", url: "/media/products/x/cover.webp", alt: "c", position: 0 },
        ],
      });
      const product = await getProduct(tx, open, id ?? "");
      expect(product?.imageUrl).toBe("/media/products/x/cover.webp");
      expect(JSON.stringify(product)).not.toContain("second.webp");
    });
  });

  it("hides a sold-out product page when hideOutOfStock is on", async () => {
    await withRollback(async (tx) => {
      const [out] = await createProducts(tx, [{ name: "Out", variants: [["S", 0]] }]);
      expect(await getProduct(tx, open, out ?? "")).toBeNull();
      expect((await getProduct(tx, { ...open, hideOutOfStock: false }, out ?? ""))?.name).toBe(
        "Out",
      );
    });
  });

  it("reads the catalog settings", async () => {
    await withRollback(async (tx) => {
      const settings = await getCatalogSettings(tx);
      expect(settings.whatsappNumber.length).toBeGreaterThan(0);
      expect(settings.messageTemplate).toContain("{producto}");
    });
  });

  describe("filters", () => {
    it("filters by size: only products with stock in that size", async () => {
      await withRollback(async (tx) => {
        await tx.product.updateMany({ data: { isPublished: false } });
        await createProducts(tx, [
          {
            name: "Has S",
            variants: [
              ["S", 2],
              ["M", 1],
            ],
          },
          {
            name: "S sold out",
            variants: [
              ["S", 0],
              ["M", 1],
            ],
          },
          { name: "Only L", variants: [["L", 1]] },
        ]);
        const names = (await listProducts(tx, open, null, { ...noFilters, talle: "S" })).map(
          (p) => p.name,
        );
        expect(names).toEqual(["Has S"]);
        const m = await listProducts(tx, open, null, { ...noFilters, talle: "M" });
        expect(m.map((p) => p.name).sort()).toEqual(["Has S", "S sold out"]);
      });
    });

    it("searches the name, case-insensitively", async () => {
      await withRollback(async (tx) => {
        await tx.product.updateMany({ data: { isPublished: false } });
        await createProducts(tx, [
          { name: "Aros dorados", variants: [["U", 1]] },
          { name: "Vestido lino", variants: [["M", 1]] },
        ]);
        const found = await listProducts(tx, open, null, { ...noFilters, q: "AROS" });
        expect(found.map((p) => p.name)).toEqual(["Aros dorados"]);
        expect(await listProducts(tx, open, null, { ...noFilters, q: "zzz" })).toEqual([]);
      });
    });

    it("searches the brand (the lot's supplier name as fallback)", async () => {
      await withRollback(async (tx) => {
        await tx.product.updateMany({ data: { isPublished: false } });
        const [id] = await createProducts(tx, [{ name: "Plain", variants: [["M", 1]] }]);
        await tx.product.update({ where: { id: id ?? "" }, data: { brand: "Zarita" } });
        const found = await listProducts(tx, open, null, { ...noFilters, q: "zari" });
        expect(found.map((p) => p.name)).toEqual(["Plain"]);
      });
    });

    it("sorts by price, ties broken by newest", async () => {
      await withRollback(async (tx) => {
        await tx.product.updateMany({ data: { isPublished: false } });
        await createProducts(tx, [
          { name: "Mid", priceGs: 200_000, variants: [["M", 1]] },
          { name: "Cheap", priceGs: 100_000, variants: [["M", 1]] },
          { name: "Dear", priceGs: 300_000, variants: [["M", 1]] },
        ]);
        const asc = await listProducts(tx, open, null, { ...noFilters, orden: "precio-asc" });
        expect(asc.map((p) => p.name)).toEqual(["Cheap", "Mid", "Dear"]);
        const desc = await listProducts(tx, open, null, { ...noFilters, orden: "precio-desc" });
        expect(desc.map((p) => p.name)).toEqual(["Dear", "Mid", "Cheap"]);
      });
    });

    it("ignores the price sort when prices are hidden", async () => {
      await withRollback(async (tx) => {
        await tx.product.updateMany({ data: { isPublished: false } });
        await createProducts(tx, [
          { name: "Old cheap", priceGs: 100_000, variants: [["M", 1]] },
          { name: "New dear", priceGs: 300_000, variants: [["M", 1]] },
        ]);
        const hidden = { ...open, showPrices: false };
        const list = await listProducts(tx, hidden, null, { ...noFilters, orden: "precio-asc" });
        expect(list.map((p) => p.name)).toEqual(["New dear", "Old cheap"]);
      });
    });
  });

  describe("category counts", () => {
    it("counts published products per category plus the total, honoring size and stock", async () => {
      await withRollback(async (tx) => {
        await tx.product.updateMany({ data: { isPublished: false } });
        await createProducts(tx, [
          { name: "D1", category: "vestidos", variants: [["S", 1]] },
          { name: "D2", category: "vestidos", variants: [["M", 1]] },
          { name: "T1", category: "tops", variants: [["S", 1]] },
          { name: "Loose", variants: [["S", 1]] },
          { name: "Out", category: "tops", variants: [["S", 0]] },
          { name: "Hidden", category: "tops", isPublished: false, variants: [["S", 1]] },
        ]);
        expect(await countProductsByCategory(tx, open, noFilters)).toEqual({
          novedades: 4,
          vestidos: 2,
          tops: 1,
          "faldas-y-shorts": 0,
          accesorios: 0,
        });
        expect(await countProductsByCategory(tx, open, { ...noFilters, talle: "S" })).toEqual({
          novedades: 3,
          vestidos: 1,
          tops: 1,
          "faldas-y-shorts": 0,
          accesorios: 0,
        });
        const withOut = await countProductsByCategory(
          tx,
          { ...open, hideOutOfStock: false },
          noFilters,
        );
        expect(withOut.tops).toBe(2);
      });
    });
  });

  describe("product detail", () => {
    it("returns ordered photos, sizes, color and description for a published product", async () => {
      await withRollback(async (tx) => {
        const [id] = await createProducts(tx, [
          {
            name: "Detail",
            variants: [
              ["M", 1],
              ["S", 0],
            ],
          },
        ]);
        await tx.product.update({
          where: { id: id ?? "" },
          data: { color: "Verde", description: "Lino fresco" },
        });
        await tx.productImage.createMany({
          data: [
            { productId: id ?? "", url: "/media/products/x/second.webp", position: 1 },
            { productId: id ?? "", url: "/media/products/x/cover.webp", position: 0 },
          ],
        });
        const detail = await getProductDetail(tx, { ...open, showSoldOutSizes: true }, id ?? "");
        expect(detail?.images.map((image) => image.url)).toEqual([
          "/media/products/x/cover.webp",
          "/media/products/x/second.webp",
        ]);
        expect(detail?.sizes).toEqual([
          { size: "S", available: false },
          { size: "M", available: true },
        ]);
        expect(detail?.color).toBe("Verde");
        expect(detail?.description).toBe("Lino fresco");
      });
    });

    it("is null for unpublished, unknown or malformed ids", async () => {
      await withRollback(async (tx) => {
        const [hidden] = await createProducts(tx, [
          { name: "Unseen", isPublished: false, variants: [["S", 1]] },
        ]);
        expect(await getProductDetail(tx, open, hidden ?? "")).toBeNull();
        expect(await getProductDetail(tx, open, "nope")).toBeNull();
        expect(await getProductDetail(tx, open, "00000000-0000-7000-8000-000000000000")).toBeNull();
      });
    });
  });
});
