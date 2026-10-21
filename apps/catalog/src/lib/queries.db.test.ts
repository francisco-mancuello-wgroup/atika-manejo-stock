import { afterAll, describe, expect, it } from "vitest";
import { createProducts, disconnectTestDb, hasDatabase, withRollback } from "../test/db";
import {
  countProductsByCategory,
  getCatalogSettings,
  getCollectionPresentation,
  getProduct,
  getProductDetail,
  listCollections,
  listLookbook,
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
        "discountPercent",
        "discountedPriceGs",
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

  describe("collections", () => {
    const unique = () => `Colección ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    it("groups visible products by supplier, with count and cover of the first photo", async () => {
      await withRollback(async (tx) => {
        await tx.product.updateMany({ data: { isPublished: false } });
        const name = unique();
        await createProducts(
          tx,
          [
            { name: "Sin foto", variants: [["M", 1]] },
            { name: "Con foto", photos: ["/media/a.webp", "/media/b.webp"], variants: [["M", 1]] },
            { name: "Oculta", isPublished: false, variants: [["M", 1]] },
            { name: "Agotada", variants: [["M", 0]] },
          ],
          name,
        );
        const list = await listCollections(tx, open);
        expect(list).toEqual([
          { slug: expect.any(String), name, count: 2, coverUrl: "/media/a.webp" },
        ]);
        const all = await listCollections(tx, { ...open, hideOutOfStock: false });
        expect(all[0]?.count).toBe(3);
      });
    });

    it("presents the pieces of one collection in import order with every photo", async () => {
      await withRollback(async (tx) => {
        await tx.product.updateMany({ data: { isPublished: false } });
        const name = unique();
        await createProducts(
          tx,
          [
            { name: "Primera", photos: ["/media/1.webp", "/media/1b.webp"], variants: [["S", 1]] },
            { name: "Segunda NEGRO", color: "", variants: [["M", 2]] },
            { name: "Fuera", isPublished: false, variants: [["M", 1]] },
          ],
          name,
        );
        await createProducts(tx, [{ name: "Otra colección", variants: [["M", 1]] }]);
        const slug = (await listCollections(tx, open)).find((c) => c.name === name)?.slug ?? "";
        const collection = await getCollectionPresentation(tx, open, slug);
        expect(collection?.name).toBe(name);
        expect(collection?.pieces.map((p) => p.name)).toEqual(["Primera", "Segunda NEGRO"]);
        expect(collection?.pieces[0]?.photos.map((p) => p.url)).toEqual([
          "/media/1.webp",
          "/media/1b.webp",
        ]);
        expect(collection?.pieces[1]?.color?.label).toBe("Negro");
        expect(await getCollectionPresentation(tx, open, "no-existe")).toBeNull();
      });
    });
  });
});

describe.skipIf(!hasDatabase)("catalog discounts (database)", () => {
  afterAll(disconnectTestDb);

  const today = new Date();
  const day = (offset: number) => {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() + offset);
    return new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`);
  };

  it("applies the highest active discount to listProducts, getProduct and getProductDetail", async () => {
    await withRollback(async (tx) => {
      await tx.discount.deleteMany();
      await tx.product.updateMany({ data: { isPublished: false } });
      const [a, b, c] = await createProducts(tx, [
        { name: "A", priceGs: 200_000, variants: [["M", 1]] },
        { name: "B", priceGs: 200_000, variants: [["M", 1]] },
        { name: "C", priceGs: 200_000, variants: [["M", 1]] },
      ]);
      await tx.discount.create({ data: { name: "Todos", percent: 10, scope: "all" } });
      await tx.discount.create({
        data: {
          name: "Sólo A y B",
          percent: 30,
          scope: "selected",
          products: { create: [{ productId: a ?? "" }, { productId: b ?? "" }] },
        },
      });
      await tx.discount.create({
        data: { name: "Apagado", percent: 80, scope: "all", isActive: false },
      });
      await tx.discount.create({
        data: { name: "Vencido", percent: 70, scope: "all", endsAt: day(-3) },
      });
      await tx.discount.create({
        data: { name: "Futuro", percent: 60, scope: "all", startsAt: day(3) },
      });

      const list = await listProducts(tx, open, null);
      const byName = Object.fromEntries(list.map((p) => [p.name, p]));
      expect(byName.A).toMatchObject({
        priceGs: 200_000,
        discountPercent: 30,
        discountedPriceGs: 140_000,
      });
      expect(byName.B).toMatchObject({ discountPercent: 30, discountedPriceGs: 140_000 });
      expect(byName.C).toMatchObject({
        priceGs: 200_000,
        discountPercent: 10,
        discountedPriceGs: 180_000,
      });

      expect(await getProduct(tx, open, a ?? "")).toMatchObject({
        discountPercent: 30,
        discountedPriceGs: 140_000,
      });
      expect(await getProductDetail(tx, open, c ?? "")).toMatchObject({
        discountPercent: 10,
        discountedPriceGs: 180_000,
      });
    });
  });

  it("keeps products undiscounted without discounts and hides it with the prices", async () => {
    await withRollback(async (tx) => {
      await tx.discount.deleteMany();
      const [id] = await createProducts(tx, [
        { name: "Solo", priceGs: 200_000, variants: [["M", 1]] },
      ]);
      expect(await getProduct(tx, open, id ?? "")).toMatchObject({
        discountPercent: null,
        discountedPriceGs: null,
      });
      await tx.discount.create({ data: { name: "Todos", percent: 10, scope: "all" } });
      const hidden = await getProduct(tx, { ...open, showPrices: false }, id ?? "");
      expect(hidden).toMatchObject({
        priceGs: null,
        discountPercent: null,
        discountedPriceGs: null,
      });
    });
  });

  it("applies discounts to the presentation pieces and the lookbook pieces", async () => {
    await withRollback(async (tx) => {
      await tx.discount.deleteMany();
      await tx.product.updateMany({ data: { isPublished: false } });
      const supplier = `Descuento ${Date.now()}`;
      const [id] = await createProducts(
        tx,
        [{ name: "Pieza", priceGs: 500_000, photos: ["/media/p.webp"], variants: [["M", 1]] }],
        supplier,
      );
      await tx.product.update({
        where: { id: id ?? "" },
        data: { catalog: "milonga", catalogOrder: 1 },
      });
      await tx.discount.create({ data: { name: "Todos", percent: 20, scope: "all" } });

      const slug = (await listCollections(tx, open)).find((c) => c.name === supplier)?.slug ?? "";
      const collection = await getCollectionPresentation(tx, open, slug);
      expect(collection?.pieces[0]).toMatchObject({
        priceGs: 500_000,
        discountPercent: 20,
        discountedPriceGs: 400_000,
      });

      const lookbook = await listLookbook(tx, open);
      expect(lookbook.milonga[0]?.pieces[0]).toMatchObject({
        priceGs: 500_000,
        discountPercent: 20,
        discountedPriceGs: 400_000,
      });
    });
  });
});
