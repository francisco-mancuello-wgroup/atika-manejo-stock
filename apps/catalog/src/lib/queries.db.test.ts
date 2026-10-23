import { ensureBrand } from "@atika/db/brands";
import { afterAll, describe, expect, it } from "vitest";
import { createProducts, disconnectTestDb, hasDatabase, withRollback } from "../test/db";
import {
  countProductsByCategory,
  getBrandLookbook,
  getCatalogSettings,
  getCollectionPresentation,
  getProduct,
  getProductDetail,
  listCollections,
  listLookbook,
  listProducts,
  listPublicBankPromos,
} from "./queries";

const noFilters = { talle: null, q: null, orden: "recientes" as const, p: null };
const open = { showPrices: true, showSoldOutSizes: false, hideOutOfStock: true };

/**
 * Like `withRollback`, but with every existing publication group switched off inside the
 * transaction: a group active in the local database would otherwise add its products to the web.
 */
const isolated: typeof withRollback = (fn) =>
  withRollback(async (tx) => {
    await tx.publicationGroup.updateMany({ data: { isActive: false } });
    // The lookbook is built from registered brands: make sure the ones the tests use exist.
    for (const name of ["Milonga", "Baobab"]) await ensureBrand(tx, name);
    return fn(tx);
  });

type Lookbook = Awaited<ReturnType<typeof listLookbook>>;
const pagesOf = (lookbook: Lookbook, slug: string) =>
  lookbook.find((brand) => brand.slug === slug)?.pages ?? [];

describe.skipIf(!hasDatabase)("catalog queries (database)", () => {
  afterAll(disconnectTestDb);

  it("lists only published products, newest first", async () => {
    await isolated(async (tx) => {
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
    await isolated(async (tx) => {
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
    await isolated(async (tx) => {
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
    await isolated(async (tx) => {
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
        "imageFocus",
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
    await isolated(async (tx) => {
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

  it("exposes the focal point of the cover and of every sheet photo", async () => {
    await isolated(async (tx) => {
      const [id] = await createProducts(tx, [{ name: "Focus", variants: [["S", 1]] }]);
      await tx.productImage.createMany({
        data: [
          {
            productId: id ?? "",
            url: "/media/products/x/cover.webp",
            position: 0,
            focusX: 30,
            focusY: 10,
            fit: 40,
          },
          { productId: id ?? "", url: "/media/products/x/second.webp", position: 1 },
        ],
      });
      const product = await getProduct(tx, open, id ?? "");
      expect(product?.imageFocus).toEqual({ focusX: 30, focusY: 10, fit: 40 });
      const detail = await getProductDetail(tx, open, id ?? "");
      expect(detail?.images.map((image) => [image.focusX, image.focusY, image.fit])).toEqual([
        [30, 10, 40],
        [50, 50, null],
      ]);
    });
  });

  it("hides a sold-out product page when hideOutOfStock is on", async () => {
    await isolated(async (tx) => {
      const [out] = await createProducts(tx, [{ name: "Out", variants: [["S", 0]] }]);
      expect(await getProduct(tx, open, out ?? "")).toBeNull();
      expect((await getProduct(tx, { ...open, hideOutOfStock: false }, out ?? ""))?.name).toBe(
        "Out",
      );
    });
  });

  it("reads the catalog settings", async () => {
    await isolated(async (tx) => {
      const settings = await getCatalogSettings(tx);
      expect(settings.whatsappNumber.length).toBeGreaterThan(0);
      expect(settings.messageTemplate).toContain("{producto}");
    });
  });

  describe("filters", () => {
    it("filters by size: only products with stock in that size", async () => {
      await isolated(async (tx) => {
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
      await isolated(async (tx) => {
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
      await isolated(async (tx) => {
        await tx.product.updateMany({ data: { isPublished: false } });
        const [id] = await createProducts(tx, [{ name: "Plain", variants: [["M", 1]] }]);
        await tx.product.update({ where: { id: id ?? "" }, data: { brand: "Zarita" } });
        const found = await listProducts(tx, open, null, { ...noFilters, q: "zari" });
        expect(found.map((p) => p.name)).toEqual(["Plain"]);
      });
    });

    it("sorts by price, ties broken by newest", async () => {
      await isolated(async (tx) => {
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
      await isolated(async (tx) => {
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
      await isolated(async (tx) => {
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
      await isolated(async (tx) => {
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
      await isolated(async (tx) => {
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
      await isolated(async (tx) => {
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
      await isolated(async (tx) => {
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
    await isolated(async (tx) => {
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
    await isolated(async (tx) => {
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
    await isolated(async (tx) => {
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
        data: { brand: "Milonga", catalog: "milonga", catalogOrder: 1 },
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
      expect(pagesOf(lookbook, "milonga")[0]?.pieces[0]).toMatchObject({
        priceGs: 500_000,
        discountPercent: 20,
        discountedPriceGs: 400_000,
      });
    });
  });
});

describe.skipIf(!hasDatabase)("catalog bank promos (database)", () => {
  afterAll(disconnectTestDb);

  // Wednesday 2026-10-21 12:00 in Asunción.
  const now = new Date("2026-10-21T15:00:00.000Z");
  const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

  async function setup(tx: Parameters<Parameters<typeof withRollback>[0]>[0]) {
    await tx.bankPromo.deleteMany();
    await tx.product.updateMany({ data: { isPublished: false } });
    const [a, b] = await createProducts(tx, [
      { name: "A", variants: [["M", 1]] },
      { name: "B", variants: [["M", 1]] },
    ]);
    const [c] = await createProducts(tx, [{ name: "C", variants: [["M", 1]] }]);
    const lotOf = async (id: string | undefined) =>
      (await tx.product.findUniqueOrThrow({ where: { id: id ?? "" } })).lotId;
    const itau = await tx.bank.create({ data: { name: "Itaú catalog test", logoUrl: "/i.webp" } });
    const conti = await tx.bank.create({ data: { name: "Continental catalog test" } });
    return { a: a ?? "", b: b ?? "", c: c ?? "", lotAB: await lotOf(a), itau, conti };
  }

  it("attaches the grouped promos that cover each product to its detail", async () => {
    await isolated(async (tx) => {
      const { a, b, c, lotAB, itau, conti } = await setup(tx);
      const banks = (...ids: string[]) => ({ create: ids.map((bankId) => ({ bankId })) });
      await tx.bankPromo.create({
        data: { kind: "installments", value: 12, scope: "all", banks: banks(itau.id) },
      });
      await tx.bankPromo.create({
        data: {
          kind: "refund",
          value: 20,
          days: [3],
          scope: "lots",
          banks: banks(conti.id),
          lots: { create: [{ lotId: lotAB }] },
        },
      });
      await tx.bankPromo.create({
        data: {
          kind: "discount",
          value: 15,
          scope: "products",
          banks: banks(itau.id),
          products: { create: [{ productId: a }] },
        },
      });

      const headlines = async (id: string) =>
        (await getProductDetail(tx, open, id, now))?.bankPromos?.map((g) => g.headline);
      expect(await headlines(a)).toEqual([
        "Hasta 12 cuotas sin intereses",
        "20 % de reintegro · Miércoles",
        "15 % de descuento",
      ]);
      expect(await headlines(b)).toEqual([
        "Hasta 12 cuotas sin intereses",
        "20 % de reintegro · Miércoles",
      ]);
      expect(await headlines(c)).toEqual(["Hasta 12 cuotas sin intereses"]);

      const detail = await getProductDetail(tx, open, a, now);
      expect(detail?.bankPromos?.[0]?.banks).toEqual([
        { id: itau.id, name: "Itaú catalog test", logoUrl: "/i.webp" },
      ]);
    });
  });

  it("leaves out promos that are inactive, expired, scheduled or not valid on the weekday", async () => {
    await isolated(async (tx) => {
      const { a, itau } = await setup(tx);
      const base = { kind: "installments" as const, scope: "all" as const };
      const banks = { create: [{ bankId: itau.id }] };
      await tx.bankPromo.create({ data: { ...base, value: 2, isActive: false, banks } });
      await tx.bankPromo.create({ data: { ...base, value: 3, endsAt: day("2026-10-20"), banks } });
      await tx.bankPromo.create({
        data: { ...base, value: 4, startsAt: day("2026-10-22"), banks },
      });
      await tx.bankPromo.create({ data: { ...base, value: 5, days: [4], banks } });
      await tx.bankPromo.create({
        data: { ...base, value: 6, startsAt: day("2026-10-21"), endsAt: day("2026-10-21"), banks },
      });
      const detail = await getProductDetail(tx, open, a, now);
      expect(detail?.bankPromos?.map((g) => g.headline)).toEqual(["Hasta 6 cuotas sin intereses"]);
    });
  });

  it("shows no promos while prices are hidden, and none when there are none", async () => {
    await isolated(async (tx) => {
      const { a, itau } = await setup(tx);
      expect((await getProductDetail(tx, open, a, now))?.bankPromos).toEqual([]);
      await tx.bankPromo.create({
        data: {
          kind: "installments",
          value: 12,
          scope: "all",
          banks: { create: [{ bankId: itau.id }] },
        },
      });
      const hidden = await getProductDetail(tx, { ...open, showPrices: false }, a, now);
      expect(hidden?.bankPromos).toEqual([]);
    });
  });

  it("attaches the promos to the lookbook pieces", async () => {
    await isolated(async (tx) => {
      const { a, itau } = await setup(tx);
      await tx.product.update({
        where: { id: a },
        data: { isPublished: true, brand: "Milonga", catalog: "milonga", catalogOrder: 1 },
      });
      await tx.productImage.create({ data: { productId: a, url: "/media/a.webp", position: 0 } });
      await tx.bankPromo.create({
        data: {
          kind: "refund",
          value: 20,
          scope: "all",
          banks: { create: [{ bankId: itau.id }] },
        },
      });
      const lookbook = await listLookbook(tx, open, now);
      const piece = pagesOf(lookbook, "milonga")
        .flatMap((page) => page.pieces)
        .find((p) => p.id === a);
      expect(piece?.bankPromos?.map((g) => g.headline)).toEqual(["20 % de reintegro"]);
    });
  });

  it("lists the live promos for the terms page, without lot or product ids", async () => {
    await isolated(async (tx) => {
      const { a, itau, conti } = await setup(tx);
      await tx.bankPromo.create({
        data: {
          name: "Reintegro Itaú",
          kind: "refund",
          value: 20,
          days: [3],
          capGs: 200_000,
          terms: "Bases del reintegro.",
          scope: "products",
          startsAt: day("2026-10-01"),
          endsAt: day("2026-10-31"),
          banks: { create: [{ bankId: conti.id }, { bankId: itau.id }] },
          products: { create: [{ productId: a }] },
        },
      });
      await tx.bankPromo.create({
        data: {
          kind: "installments",
          value: 12,
          scope: "all",
          banks: { create: [{ bankId: itau.id }] },
        },
      });
      await tx.bankPromo.create({
        data: {
          kind: "discount",
          value: 10,
          scope: "all",
          isActive: false,
          banks: { create: [{ bankId: itau.id }] },
        },
      });
      const promos = await listPublicBankPromos(tx, open, now);
      expect(promos[0]?.name).toBeNull();
      expect(promos.map((p) => p.headline)).toEqual([
        "Hasta 12 cuotas sin intereses",
        "20 % de reintegro · Miércoles · Tope ₲ 200.000",
      ]);
      expect(promos[1]).toMatchObject({
        name: "Reintegro Itaú",
        kind: "refund",
        terms: "Bases del reintegro.",
        startsAt: "2026-10-01",
        endsAt: "2026-10-31",
        appliesTo: "selected",
        banks: [
          { id: conti.id, name: "Continental catalog test", logoUrl: null },
          { id: itau.id, name: "Itaú catalog test", logoUrl: "/i.webp" },
        ],
      });
      expect(Object.keys(promos[1] ?? {}).sort()).toEqual(
        [
          "appliesTo",
          "banks",
          "endsAt",
          "headline",
          "id",
          "kind",
          "name",
          "startsAt",
          "terms",
        ].sort(),
      );
      expect(await listPublicBankPromos(tx, { ...open, showPrices: false }, now)).toEqual([]);
    });
  });
});

describe.skipIf(!hasDatabase)("catalog publication groups (database)", () => {
  afterAll(disconnectTestDb);

  const now = new Date("2030-06-15T12:00:00.000Z");
  const day = 86_400_000;

  /** Puts `[size, allocated, sold]` of a product into a new group. */
  async function group(
    tx: Parameters<Parameters<typeof withRollback>[0]>[0],
    productId: string,
    allocations: [string, number, number?, number?][],
    data: { isActive?: boolean; startsAt?: Date; endsAt?: Date } = {},
  ) {
    const variants = await tx.productVariant.findMany({ where: { productId } });
    await tx.publicationGroup.create({
      data: {
        name: "Test group",
        isActive: data.isActive ?? true,
        startsAt: data.startsAt ?? null,
        endsAt: data.endsAt ?? null,
        allocations: {
          create: allocations.map(([size, allocated, sold, priceGs]) => ({
            variantId: variants.find((variant) => variant.size === size)?.id ?? "",
            allocated,
            sold: sold ?? 0,
            priceGs: priceGs ?? null,
          })),
        },
      },
    });
  }

  const sizesOf = async (products: { sizes: { size: string }[] }[]) =>
    products.map((product) => product.sizes.map((size) => size.size));

  it("shows an unpublished product of an active group with only its grouped sizes", async () => {
    await isolated(async (tx) => {
      await tx.product.updateMany({ data: { isPublished: false } });
      const [id] = await createProducts(tx, [
        {
          name: "Grouped",
          isPublished: false,
          variants: [
            ["S", 5],
            ["M", 5],
          ],
        },
      ]);
      await group(tx, id ?? "", [["S", 3]]);
      const products = await listProducts(tx, open, null, noFilters, now);
      expect(products.map((p) => p.name)).toEqual(["Grouped"]);
      expect(await sizesOf(products)).toEqual([["S"]]);
      expect((await getProduct(tx, open, id ?? "", now))?.name).toBe("Grouped");
      expect((await getProductDetail(tx, open, id ?? "", now))?.name).toBe("Grouped");
      expect((await countProductsByCategory(tx, open, noFilters, now)).novedades).toBe(1);
    });
  });

  it("hides the product of an inactive, scheduled or expired group", async () => {
    await isolated(async (tx) => {
      await tx.product.updateMany({ data: { isPublished: false } });
      const ids = await createProducts(tx, [
        { name: "Off", isPublished: false, variants: [["M", 5]] },
        { name: "Soon", isPublished: false, variants: [["M", 5]] },
        { name: "Over", isPublished: false, variants: [["M", 5]] },
      ]);
      await group(tx, ids[0] ?? "", [["M", 3]], { isActive: false });
      await group(tx, ids[1] ?? "", [["M", 3]], { startsAt: new Date(now.getTime() + day) });
      await group(tx, ids[2] ?? "", [["M", 3]], { endsAt: new Date(now.getTime() - day) });
      expect(await listProducts(tx, open, null, noFilters, now)).toEqual([]);
      expect(await getProduct(tx, open, ids[0] ?? "", now)).toBeNull();
      expect((await countProductsByCategory(tx, open, noFilters, now)).novedades).toBe(0);
    });
  });

  it("hides an unpublished product once its group is sold out, even without hideOutOfStock", async () => {
    await isolated(async (tx) => {
      await tx.product.updateMany({ data: { isPublished: false } });
      const [id] = await createProducts(tx, [
        { name: "Gone", isPublished: false, variants: [["M", 5]] },
      ]);
      await group(tx, id ?? "", [["M", 3, 3]]);
      const showAll = { ...open, hideOutOfStock: false };
      expect(await listProducts(tx, showAll, null, noFilters, now)).toEqual([]);
      expect(await getProduct(tx, showAll, id ?? "", now)).toBeNull();
      expect(await listCollections(tx, showAll, now)).toEqual([]);
    });
  });

  it("shows the group remainder on the grouped size and free inventory on the others", async () => {
    await isolated(async (tx) => {
      await tx.product.updateMany({ data: { isPublished: false } });
      const [id] = await createProducts(tx, [
        {
          name: "Mixed",
          variants: [
            ["S", 5],
            ["M", 5],
            ["L", 0],
          ],
        },
      ]);
      // S keeps 2 of 3 for the web; M is free inventory; L has no stock.
      await group(tx, id ?? "", [["S", 3, 1]]);
      const shown = { ...open, showSoldOutSizes: true };
      const [product] = await listProducts(tx, shown, null, noFilters, now);
      expect(product?.sizes).toEqual([
        { size: "S", available: true },
        { size: "M", available: true },
        { size: "L", available: false },
      ]);
      // A sold-out group size drops out while the rest stays published.
      await tx.groupAllocation.updateMany({ data: { sold: 3 } });
      const [after] = await listProducts(tx, open, null, noFilters, now);
      expect(after?.sizes).toEqual([{ size: "M", available: true }]);
    });
  });

  it("applies the size filter and the counts on web stock", async () => {
    await isolated(async (tx) => {
      await tx.product.updateMany({ data: { isPublished: false } });
      const [id] = await createProducts(tx, [
        {
          name: "Sized",
          category: "vestidos",
          isPublished: false,
          variants: [
            ["S", 5],
            ["M", 5],
          ],
        },
      ]);
      await group(tx, id ?? "", [["S", 3]]);
      const withS = { ...noFilters, talle: "S" };
      const withM = { ...noFilters, talle: "M" };
      expect((await listProducts(tx, open, null, withS, now)).length).toBe(1);
      expect(await listProducts(tx, open, null, withM, now)).toEqual([]);
      expect((await countProductsByCategory(tx, open, withS, now)).vestidos).toBe(1);
      expect((await countProductsByCategory(tx, open, withM, now)).vestidos).toBe(0);
    });
  });

  it("includes grouped products in collections, presentation and lookbook", async () => {
    await isolated(async (tx) => {
      await tx.product.updateMany({ data: { isPublished: false } });
      const [id] = await createProducts(
        tx,
        [
          {
            name: "Piece",
            isPublished: false,
            photos: ["/a.jpg"],
            variants: [
              ["S", 5],
              ["M", 5],
            ],
          },
        ],
        "Group collection",
      );
      await tx.product.update({
        where: { id: id ?? "" },
        data: { brand: "Milonga", catalog: "milonga", catalogOrder: 1 },
      });
      await group(tx, id ?? "", [["S", 2]]);
      expect(await listCollections(tx, open, now)).toMatchObject([
        { name: "Group collection", count: 1 },
      ]);
      const collection = await getCollectionPresentation(tx, open, "group-collection", now);
      expect(collection?.pieces.map((piece) => piece.sizes.map((s) => s.size))).toEqual([["S"]]);
      const lookbook = await listLookbook(tx, open, now);
      expect(
        pagesOf(lookbook, "milonga").flatMap((page) => page.pieces.map((piece) => piece.sizes)),
      ).toEqual([["S"]]);
    });
  });

  it("flags the lookbook pieces held by an active group, and nothing else", async () => {
    await isolated(async (tx) => {
      await tx.product.updateMany({ data: { isPublished: false } });
      const ids = await createProducts(tx, [
        { name: "InGroup", photos: ["/a.jpg"], variants: [["S", 5]] },
        { name: "Plain", photos: ["/b.jpg"], variants: [["S", 5]] },
        { name: "Off", photos: ["/c.jpg"], variants: [["S", 5]] },
      ]);
      for (const [index, id] of ids.entries()) {
        await tx.product.update({
          where: { id },
          data: { brand: "Milonga", catalog: "milonga", catalogOrder: index + 1 },
        });
      }
      await group(tx, ids[0] ?? "", [["S", 2]]);
      await group(tx, ids[2] ?? "", [["S", 2]], { isActive: false });
      const lookbook = await listLookbook(tx, open, now);
      const pieces = pagesOf(lookbook, "milonga").flatMap((page) => page.pieces);
      expect(pieces.map((piece) => [piece.name, piece.inGroup])).toEqual([
        ["InGroup", true],
        ["Plain", false],
        ["Off", false],
      ]);
    });
  });

  it("reads the event price of a group size and leaves the product price alone", async () => {
    await isolated(async (tx) => {
      await tx.product.updateMany({ data: { isPublished: false } });
      const [priced = "", plain = ""] = await createProducts(tx, [
        { name: "Priced", priceGs: 1_584_000, photos: ["/a.jpg"], variants: [["S", 1]] },
        { name: "Plain", priceGs: 500_000, photos: ["/b.jpg"], variants: [["S", 1]] },
      ]);
      await tx.product.updateMany({
        where: { id: { in: [priced, plain] } },
        data: { brand: "Milonga", catalog: "milonga" },
      });
      await group(tx, priced, [["S", 1, 0, 1_553_000]]);
      await group(tx, plain, [["S", 1]]);
      const pieces = pagesOf(await listLookbook(tx, open, now), "milonga").flatMap(
        (page) => page.pieces,
      );
      expect(
        pieces.map((piece) => [piece.name, piece.priceGs, piece.pinkPrice?.priceGs ?? null]),
      ).toEqual([
        ["Plain", 500_000, null],
        ["Priced", 1_584_000, 1_553_000],
      ]);
    });
  });

  it("shows group pieces in the lookbook of their brand, without a hand-set catalog", async () => {
    await isolated(async (tx) => {
      await tx.product.updateMany({ data: { isPublished: false } });
      const ids = await createProducts(tx, [
        { name: "Falda Atlas", photos: ["/a.jpg"], variants: [["S", 1]] },
        { name: "Lia Dress", photos: ["/b.jpg"], variants: [["S", 1]] },
        { name: "Off group", photos: ["/d.jpg"], variants: [["S", 1]] },
      ]);
      const [atlas = "", lia = "", off = ""] = ids;
      await tx.product.update({ where: { id: atlas }, data: { brand: "Milonga" } });
      await tx.product.update({ where: { id: lia }, data: { brand: "Baobab" } });
      await group(tx, atlas, [["S", 1]]);
      await group(tx, lia, [["S", 1, 0, 1_553_000]]);
      await group(tx, off, [["S", 1]], { isActive: false });

      const lookbook = await listLookbook(tx, open, now);
      const names = (slug: string) =>
        pagesOf(lookbook, slug).flatMap((page) => page.pieces.map((piece) => piece.name));
      expect(names("milonga")).toEqual(["Falda Atlas"]);
      expect(names("baobab")).toEqual(["Lia Dress"]);
      expect(pagesOf(lookbook, "baobab")[0]?.pieces[0]?.pinkPrice?.priceGs).toBe(1_553_000);
    });
  });
});

describe.skipIf(!hasDatabase)("brand lookbooks (database)", () => {
  afterAll(disconnectTestDb);

  const now = new Date("2030-06-15T12:00:00.000Z");

  /** Holds one unit of the first size of a product in a new active group. */
  async function group(tx: Parameters<Parameters<typeof withRollback>[0]>[0], productId: string) {
    const variant = await tx.productVariant.findFirstOrThrow({ where: { productId } });
    await tx.publicationGroup.create({
      data: {
        name: "Test group",
        isActive: true,
        allocations: { create: [{ variantId: variant.id, allocated: 1 }] },
      },
    });
  }

  /** A brand of its own for the test, so real data never mixes in. */
  async function brand(
    tx: Parameters<Parameters<typeof withRollback>[0]>[0],
    name: string,
    data: { isActive?: boolean; coverUrl?: string } = {},
  ) {
    const row = await ensureBrand(tx, name);
    return data.isActive === undefined && data.coverUrl === undefined
      ? row
      : tx.brand.update({ where: { id: row.id }, data });
  }

  const piece = (name: string, brandName: string | undefined, extra = {}) => ({
    name,
    brand: brandName,
    photos: [`/media/${name}.webp`],
    variants: [["M", 1]] as [string, number][],
    ...extra,
  });

  async function unpublishAll(tx: Parameters<Parameters<typeof withRollback>[0]>[0]) {
    await tx.product.updateMany({ data: { isPublished: false } });
  }

  it("makes one catalog per active brand with pieces, in brand order, with no hand-set catalog", async () => {
    await isolated(async (tx) => {
      await unpublishAll(tx);
      await brand(tx, "Zeta Brand");
      await brand(tx, "Alfa Brand");
      await brand(tx, "Empty Brand");
      await createProducts(tx, [
        piece("Z1", "Zeta Brand"),
        piece("A1", "alfa brand"),
        piece("Hidden", "Empty Brand", { isPublished: false }),
      ]);
      const lookbook = await listLookbook(tx, open, now);
      // Registered in this order: Zeta first, then Alfa (position), "Empty Brand" has no piece
      expect(lookbook.map((entry) => entry.slug)).toEqual(["zeta-brand", "alfa-brand"]);
      expect(lookbook.map((entry) => entry.name)).toEqual(["Zeta Brand", "Alfa Brand"]);
      expect(pagesOf(lookbook, "alfa-brand")[0]?.title).toBe("A1");
    });
  });

  it("orders a brand: PDF pages first, then the pieces without one newest first", async () => {
    await isolated(async (tx) => {
      await unpublishAll(tx);
      await brand(tx, "Order Brand");
      const ids = await createProducts(tx, [
        piece("Old loose", "Order Brand"),
        piece("Page 5", "Order Brand"),
        piece("New loose", "Order Brand"),
        piece("Page 2", "Order Brand"),
      ]);
      await tx.product.update({ where: { id: ids[1] ?? "" }, data: { catalogOrder: 5 } });
      await tx.product.update({ where: { id: ids[3] ?? "" }, data: { catalogOrder: 2 } });
      const pages = pagesOf(await listLookbook(tx, open, now), "order-brand");
      expect(pages.map((page) => page.title)).toEqual([
        "Page 2",
        "Page 5",
        "New loose",
        "Old loose",
      ]);
      expect(pages.map((page) => page.page)).toEqual([1, 2, 3, 4]);
    });
  });

  it("keeps the sets that share a page together inside the brand", async () => {
    await isolated(async (tx) => {
      await unpublishAll(tx);
      await brand(tx, "Set Brand");
      const ids = await createProducts(tx, [
        piece("Top", "Set Brand"),
        piece("Falda", "Set Brand"),
      ]);
      await tx.product.updateMany({ where: { id: { in: ids } }, data: { catalogOrder: 7 } });
      const pages = pagesOf(await listLookbook(tx, open, now), "set-brand");
      expect(pages).toHaveLength(1);
      expect(pages[0]?.pieces.map((p) => p.name).sort()).toEqual(["Falda", "Top"]);
    });
  });

  it("ignores the old catalog column: grouping is by brand", async () => {
    await isolated(async (tx) => {
      await unpublishAll(tx);
      await brand(tx, "Moved Brand");
      const [id = ""] = await createProducts(tx, [piece("Moved", "Moved Brand")]);
      await tx.product.update({ where: { id }, data: { catalog: "sordo", catalogOrder: 1 } });
      const lookbook = await listLookbook(tx, open, now);
      expect(pagesOf(lookbook, "moved-brand")).toHaveLength(1);
      expect(pagesOf(lookbook, "sordo")).toEqual([]);
    });
  });

  it("sends pieces without a brand or with an unregistered one to Otras marcas", async () => {
    await isolated(async (tx) => {
      await unpublishAll(tx);
      await createProducts(tx, [
        piece("No brand", undefined),
        piece("Unknown", "Nobody Registered"),
      ]);
      const names = pagesOf(await listLookbook(tx, open, now), "otras-marcas").flatMap((page) =>
        page.pieces.map((p) => p.name),
      );
      expect(names.sort()).toEqual(["No brand", "Unknown"]);
    });
  });

  describe("an inactive brand disappears from the whole web", () => {
    async function setup(tx: Parameters<Parameters<typeof withRollback>[0]>[0]) {
      await unpublishAll(tx);
      await brand(tx, "Gone Brand", { isActive: false });
      await brand(tx, "Kept Brand");
      const [gone = "", kept = ""] = await createProducts(tx, [
        piece("Gone piece", "gone brand", { category: "vestidos" }),
        piece("Kept piece", "Kept Brand", { category: "vestidos" }),
      ]);
      return { gone, kept };
    }

    it("leaves it out of the lookbook, the lists, the counts and the collections", async () => {
      await isolated(async (tx) => {
        await setup(tx);
        const lookbook = await listLookbook(tx, open, now);
        expect(lookbook.map((entry) => entry.slug)).toEqual(["kept-brand"]);
        expect((await listProducts(tx, open, null, noFilters, now)).map((p) => p.name)).toEqual([
          "Kept piece",
        ]);
        expect((await countProductsByCategory(tx, open, noFilters, now)).novedades).toBe(1);
        const collections = await listCollections(tx, open, now);
        expect(collections).toHaveLength(1);
      });
    });

    it("hides its product page and detail", async () => {
      await isolated(async (tx) => {
        const { gone, kept } = await setup(tx);
        expect(await getProduct(tx, open, gone, now)).toBeNull();
        expect(await getProductDetail(tx, open, gone, now)).toBeNull();
        expect((await getProduct(tx, open, kept, now))?.name).toBe("Kept piece");
      });
    });

    it("hides it from the search by name, and from the lookbook of its slug", async () => {
      await isolated(async (tx) => {
        await setup(tx);
        const found = await listProducts(tx, open, null, { ...noFilters, q: "gone" }, now);
        expect(found).toEqual([]);
        expect(await getBrandLookbook(tx, open, "gone-brand", now)).toBeNull();
      });
    });

    it("hides the Pink pieces of the brand too", async () => {
      await isolated(async (tx) => {
        const { gone, kept } = await setup(tx);
        for (const id of [gone, kept]) await group(tx, id);
        const lookbook = await listLookbook(tx, open, now);
        expect(
          lookbook.flatMap((entry) => entry.pages).flatMap((p) => p.pieces.map((x) => x.name)),
        ).toEqual(["Kept piece"]);
      });
    });
  });

  it("hides the pieces without a known brand when Otras marcas is turned off", async () => {
    await isolated(async (tx) => {
      await unpublishAll(tx);
      await brand(tx, "Still Brand");
      await tx.brand.updateMany({ where: { isFallback: true }, data: { isActive: false } });
      const [loose = "", still = ""] = await createProducts(tx, [
        piece("Loose", undefined),
        piece("Still", "Still Brand"),
      ]);
      await createProducts(tx, [piece("Unknown", "Never Registered")]);
      expect((await listProducts(tx, open, null, noFilters, now)).map((p) => p.name)).toEqual([
        "Still",
      ]);
      expect(await getProduct(tx, open, loose, now)).toBeNull();
      expect((await getProduct(tx, open, still, now))?.name).toBe("Still");
      expect((await listLookbook(tx, open, now)).map((entry) => entry.slug)).toEqual([
        "still-brand",
      ]);
    });
  });

  it("looks a brand up by slug, empty or not, and by its old catalog slug", async () => {
    await isolated(async (tx) => {
      await unpublishAll(tx);
      const empty = await brand(tx, "Quiet Brand");
      const found = await getBrandLookbook(tx, open, empty.slug, now);
      expect(found).toMatchObject({ slug: "quiet-brand", name: "Quiet Brand", pages: [] });
      expect(await getBrandLookbook(tx, open, "nope", now)).toBeNull();
      // The old catalogs are brands with the same slug
      expect((await getBrandLookbook(tx, open, "milonga", now))?.name).toBe("Milonga");
    });
  });

  it("reads the cover uploaded for the brand", async () => {
    await isolated(async (tx) => {
      await unpublishAll(tx);
      await brand(tx, "Cover Brand", { coverUrl: "/media/brands/uploads/x/c.webp" });
      await createProducts(tx, [piece("C1", "Cover Brand")]);
      const entry = (await listLookbook(tx, open, now)).find((e) => e.slug === "cover-brand");
      expect(entry?.coverUrl).toBe("/media/brands/uploads/x/c.webp");
    });
  });
});
