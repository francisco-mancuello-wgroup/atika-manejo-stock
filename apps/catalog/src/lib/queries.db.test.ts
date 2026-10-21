import { afterAll, describe, expect, it } from "vitest";
import { createProducts, disconnectTestDb, hasDatabase, withRollback } from "../test/db";
import { getCatalogSettings, getProduct, listProducts } from "./queries";

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
});
