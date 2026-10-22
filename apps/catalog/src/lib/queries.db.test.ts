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
  listPublicBankPromos,
} from "./queries";

const noFilters = { talle: null, q: null, orden: "recientes" as const, p: null };
const open = { showPrices: true, showSoldOutSizes: false, hideOutOfStock: true };

/**
 * Like `withRollback`, but with every existing publication group switched off inside the
 * transaction: a group active in the local database would otherwise flip the web to groups mode.
 */
const isolated: typeof withRollback = (fn) =>
  withRollback(async (tx) => {
    await tx.publicationGroup.updateMany({ data: { isActive: false } });
    return fn(tx);
  });

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
        data: { isPublished: true, catalog: "milonga", catalogOrder: 1 },
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
      const piece = lookbook.milonga.flatMap((page) => page.pieces).find((p) => p.id === a);
      expect(piece?.bankPromos?.map((g) => g.headline)).toEqual(["20 % de reintegro"]);
    });
  });

  it("lists the live promos for the terms page, without lot or product ids", async () => {
    await isolated(async (tx) => {
      const { a, itau, conti } = await setup(tx);
      await tx.bankPromo.create({
        data: {
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
      expect(promos.map((p) => p.headline)).toEqual([
        "Hasta 12 cuotas sin intereses",
        "20 % de reintegro · Miércoles · Tope ₲ 200.000",
      ]);
      expect(promos[1]).toMatchObject({
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
        ["appliesTo", "banks", "endsAt", "headline", "id", "kind", "startsAt", "terms"].sort(),
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
    allocations: [string, number, number?][],
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
          create: allocations.map(([size, allocated, sold]) => ({
            variantId: variants.find((variant) => variant.size === size)?.id ?? "",
            allocated,
            sold: sold ?? 0,
          })),
        },
      },
    });
  }

  const sizesOf = async (products: { sizes: { size: string }[] }[]) =>
    products.map((product) => product.sizes.map((size) => size.size));

  it("with no active group shows published products with their full physical stock", async () => {
    await isolated(async (tx) => {
      await tx.product.updateMany({ data: { isPublished: false } });
      const [pub, hidden] = await createProducts(tx, [
        {
          name: "Published",
          variants: [
            ["S", 5],
            ["M", 2],
          ],
        },
        { name: "Hidden", isPublished: false, variants: [["M", 4]] },
      ]);
      // Switched off, scheduled and expired groups don't count as active.
      await group(tx, pub ?? "", [["S", 1]], { isActive: false });
      await group(tx, pub ?? "", [["S", 1]], { startsAt: new Date(now.getTime() + day) });
      await group(tx, hidden ?? "", [["M", 1]], { endsAt: new Date(now.getTime() - day) });
      const products = await listProducts(tx, open, null, noFilters, now);
      expect(products.map((p) => p.name)).toEqual(["Published"]);
      expect(await sizesOf(products)).toEqual([["S", "M"]]);
      expect((await getProduct(tx, open, pub ?? "", now))?.name).toBe("Published");
      expect(await getProduct(tx, open, hidden ?? "", now)).toBeNull();
      expect(await getProductDetail(tx, open, hidden ?? "", now)).toBeNull();
      expect((await countProductsByCategory(tx, open, noFilters, now)).novedades).toBe(1);
    });
  });

  it("with an active group shows only its products and grouped sizes, ignoring isPublished", async () => {
    await isolated(async (tx) => {
      await tx.product.updateMany({ data: { isPublished: false } });
      const [grouped, published, plain] = await createProducts(tx, [
        {
          name: "Grouped",
          isPublished: false,
          category: "vestidos",
          variants: [
            ["S", 5],
            ["M", 5],
          ],
        },
        { name: "Published", category: "vestidos", variants: [["M", 5]] },
        { name: "Plain", isPublished: false, variants: [["M", 5]] },
      ]);
      await group(tx, grouped ?? "", [["S", 3]]);
      const shown = { ...open, showSoldOutSizes: true };
      const products = await listProducts(tx, shown, null, noFilters, now);
      expect(products.map((p) => p.name)).toEqual(["Grouped"]);
      // The ungrouped size M reads sold out instead of showing its free stock.
      expect(products[0]?.sizes).toEqual([
        { size: "S", available: true },
        { size: "M", available: false },
      ]);
      expect(await sizesOf(await listProducts(tx, open, null, noFilters, now))).toEqual([["S"]]);
      expect((await getProduct(tx, open, grouped ?? "", now))?.name).toBe("Grouped");
      expect((await getProductDetail(tx, open, grouped ?? "", now))?.name).toBe("Grouped");
      // Published but outside the group, and unpublished without group: both are not found.
      for (const id of [published, plain]) {
        expect(await getProduct(tx, open, id ?? "", now)).toBeNull();
        expect(await getProductDetail(tx, open, id ?? "", now)).toBeNull();
      }
      const counts = await countProductsByCategory(tx, open, noFilters, now);
      expect(counts.novedades).toBe(1);
      expect(counts.vestidos).toBe(1);
    });
  });

  it("unions the products of several active groups", async () => {
    await isolated(async (tx) => {
      await tx.product.updateMany({ data: { isPublished: false } });
      const [a, b, c] = await createProducts(tx, [
        { name: "A", variants: [["M", 5]] },
        { name: "B", isPublished: false, variants: [["M", 5]] },
        { name: "C", variants: [["M", 5]] },
      ]);
      await group(tx, a ?? "", [["M", 2]]);
      await group(tx, b ?? "", [["M", 2]]);
      const names = (await listProducts(tx, open, null, noFilters, now)).map((p) => p.name).sort();
      expect(names).toEqual(["A", "B"]);
      expect(await getProduct(tx, open, c ?? "", now)).toBeNull();
    });
  });

  it("a group sold out on every size follows hideOutOfStock", async () => {
    await isolated(async (tx) => {
      await tx.product.updateMany({ data: { isPublished: false } });
      const [id, other] = await createProducts(tx, [
        { name: "Gone", isPublished: false, variants: [["M", 5]] },
        { name: "Other", variants: [["M", 5]] },
      ]);
      await group(tx, id ?? "", [["M", 3, 3]]);
      const showAll = { ...open, hideOutOfStock: false };
      expect(await listProducts(tx, open, null, noFilters, now)).toEqual([]);
      expect(await getProduct(tx, open, id ?? "", now)).toBeNull();
      expect((await countProductsByCategory(tx, open, noFilters, now)).novedades).toBe(0);
      // Shown sold out when out-of-stock products stay; the published one is still hidden.
      const products = await listProducts(tx, showAll, null, noFilters, now);
      expect(products.map((p) => p.name)).toEqual(["Gone"]);
      expect((await getProduct(tx, showAll, id ?? "", now))?.name).toBe("Gone");
      expect(await getProduct(tx, showAll, other ?? "", now)).toBeNull();
      expect((await listCollections(tx, showAll, now)).length).toBe(1);
    });
  });

  it("applies the size filter and the counts on group stock", async () => {
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

  it("limits collections, presentation and lookbook to the active group", async () => {
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
      const [outside] = await createProducts(
        tx,
        [{ name: "Outside", photos: ["/b.jpg"], variants: [["M", 5]] }],
        "Outside collection",
      );
      for (const [pid, order] of [
        [id, 1],
        [outside, 2],
      ] as const) {
        await tx.product.update({
          where: { id: pid ?? "" },
          data: { catalog: "milonga", catalogOrder: order },
        });
      }
      await group(tx, id ?? "", [["S", 2]]);
      expect(await listCollections(tx, open, now)).toMatchObject([
        { name: "Group collection", count: 1 },
      ]);
      const collection = await getCollectionPresentation(tx, open, "group-collection", now);
      expect(collection?.pieces.map((piece) => piece.sizes.map((s) => s.size))).toEqual([["S"]]);
      expect(await getCollectionPresentation(tx, open, "outside-collection", now)).toBeNull();
      const lookbook = await listLookbook(tx, open, now);
      expect(lookbook.milonga.flatMap((page) => page.pieces.map((piece) => piece.sizes))).toEqual([
        ["S"],
      ]);
    });
  });
});
