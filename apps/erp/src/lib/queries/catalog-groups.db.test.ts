import { ensureBrand } from "@atika/db/brands";
import { afterAll, describe, expect, it } from "vitest";
import { createFixtureLot, disconnectTestDb, hasDatabase, withRollback } from "../../test/db";
import {
  getActiveGroupNames,
  getGroupCandidates,
  getGroupDetail,
  getGroupList,
  getGroupOptions,
  getProductGroupNames,
} from "./catalog-groups";

const NOW = new Date("2026-10-22T15:00:00.000Z");

describe.skipIf(!hasDatabase)("catalog group queries (database)", () => {
  afterAll(disconnectTestDb);

  async function fixture(tx: Parameters<Parameters<typeof withRollback>[0]>[0]) {
    const { lot, products } = await createFixtureLot(tx, [
      {
        name: "Vestido",
        originalValueUsd: 10,
        variants: [
          ["S", 10, 10],
          ["M", 4, 4],
        ],
      },
      { name: "Top", originalValueUsd: 10, variants: [["U", 3, 3]] },
    ]);
    const [vestido, top] = products as [(typeof products)[number], (typeof products)[number]];
    const variant = (product: typeof vestido, size: string) => {
      const found = product.variants.find((candidate) => candidate.size === size);
      if (!found) throw new Error(`missing size ${size}`);
      return found;
    };
    return { lot, vestido, top, variant };
  }

  it("lists groups with product and unit totals, and the status at now", async () => {
    await withRollback(async (tx) => {
      const { vestido, top, variant } = await fixture(tx);
      const active = await tx.publicationGroup.create({
        data: {
          name: "Verano q-list",
          isActive: true,
          startsAt: new Date("2026-10-01T00:00:00Z"),
          endsAt: new Date("2026-10-31T23:59:59.999Z"),
          createdAt: new Date("2031-01-02"),
          allocations: {
            create: [
              { variantId: variant(vestido, "S").id, allocated: 6, sold: 2 },
              { variantId: variant(vestido, "M").id, allocated: 3, sold: 0 },
              { variantId: top.variants[0]?.id as string, allocated: 9, sold: 0 },
            ],
          },
        },
      });
      const empty = await tx.publicationGroup.create({
        data: { name: "Vacío q-list", createdAt: new Date("2031-01-01") },
      });
      const list = await getGroupList(tx, NOW);
      const found = list.find((group) => group.id === active.id);
      expect(found).toEqual({
        id: active.id,
        name: "Verano q-list",
        isActive: true,
        startsAt: "2026-10-01",
        endsAt: "2026-10-31",
        status: "Activo",
        productCount: 2,
        // The top has stock 3: its remainder is capped by the physical stock.
        allocated: 18,
        sold: 2,
        remaining: 4 + 3 + 3,
      });
      expect(list.find((group) => group.id === empty.id)).toMatchObject({
        status: "Inactivo",
        productCount: 0,
        allocated: 0,
        remaining: 0,
        startsAt: null,
      });
      expect(list.findIndex((g) => g.id === active.id)).toBeLessThan(
        list.findIndex((g) => g.id === empty.id),
      );
    });
  });

  it("details the products of a group with every size and its stock figures", async () => {
    await withRollback(async (tx) => {
      const { vestido, variant } = await fixture(tx);
      const other = await tx.publicationGroup.create({
        data: {
          name: "Otro",
          isActive: true,
          allocations: { create: [{ variantId: variant(vestido, "S").id, allocated: 4, sold: 1 }] },
        },
      });
      const group = await tx.publicationGroup.create({
        data: {
          name: "Detalle",
          allocations: { create: [{ variantId: variant(vestido, "M").id, allocated: 3, sold: 1 }] },
        },
      });
      const detail = await getGroupDetail(tx, group.id, NOW);
      expect(detail).toMatchObject({ id: group.id, name: "Detalle", status: "Inactivo" });
      expect(detail?.products).toHaveLength(1);
      const product = detail?.products[0];
      expect(product).toMatchObject({ id: vestido.id, name: "Vestido" });
      // Sizes in display order; S is held 3 (4-1) by the other active group.
      expect(product?.sizes).toEqual([
        {
          variantId: variant(vestido, "S").id,
          size: "S",
          stock: 10,
          free: 7,
          allocated: 0,
          sold: 0,
          remaining: 0,
          // Nothing sold yet, 3 held by the other active group.
          max: 7,
        },
        {
          variantId: variant(vestido, "M").id,
          size: "M",
          stock: 4,
          free: 4,
          allocated: 3,
          sold: 1,
          remaining: 2,
          max: 5,
        },
      ]);
      expect(detail?.preview).toEqual({ products: 1, units: 2 });
      expect(product?.imageUrl).toBeNull();
      expect(other.id).not.toBe(group.id);
    });
  });

  it("returns null for an unknown or malformed group id", async () => {
    await withRollback(async (tx) => {
      expect(await getGroupDetail(tx, "nope", NOW)).toBeNull();
      expect(await getGroupDetail(tx, "00000000-0000-4000-8000-000000000000", NOW)).toBeNull();
    });
  });

  it("offers lots and brands for the bulk add", async () => {
    await withRollback(async (tx) => {
      const { lot, vestido } = await fixture(tx);
      const brand = await ensureBrand(tx, "Zeta q-opt");
      await tx.product.update({ where: { id: vestido.id }, data: { brand: "Zeta q-opt" } });
      const options = await getGroupOptions(tx);
      expect(options.lots).toContainEqual({ id: lot.id, name: lot.name });
      expect(options.brands).toContainEqual({ slug: brand.slug, name: "Zeta q-opt" });
      expect(options.brands.at(-1)).toEqual({ slug: "otras-marcas", name: "Otras marcas" });
    });
  });

  it("maps each product to the active group it sits in", async () => {
    await withRollback(async (tx) => {
      const { vestido, top, variant } = await fixture(tx);
      await tx.publicationGroup.create({
        data: {
          name: "En vivo",
          isActive: true,
          allocations: { create: [{ variantId: variant(vestido, "S").id, allocated: 2 }] },
        },
      });
      await tx.publicationGroup.create({
        data: {
          name: "Apagado",
          allocations: { create: [{ variantId: top.variants[0]?.id as string, allocated: 1 }] },
        },
      });
      const names = await getProductGroupNames(tx, [vestido.id, top.id], NOW);
      expect(names.get(vestido.id)).toBe("En vivo");
      expect(names.has(top.id)).toBe(false);
    });
  });

  it("gives the cover image of a product in the detail", async () => {
    await withRollback(async (tx) => {
      const { vestido, variant } = await fixture(tx);
      await tx.productImage.createMany({
        data: [
          { productId: vestido.id, url: "/b.jpg", position: 1 },
          { productId: vestido.id, url: "/a.jpg", position: 0 },
        ],
      });
      const group = await tx.publicationGroup.create({
        data: {
          name: "Con foto",
          allocations: { create: [{ variantId: variant(vestido, "S").id, allocated: 1 }] },
        },
      });
      const detail = await getGroupDetail(tx, group.id, NOW);
      expect(detail?.products[0]?.imageUrl).toBe("/a.jpg");
    });
  });

  describe("getActiveGroupNames", () => {
    it("lists the names of the groups that are on and inside their window", async () => {
      await withRollback(async (tx) => {
        await tx.publicationGroup.updateMany({ data: { isActive: false } });
        const now = new Date("2030-06-15T12:00:00.000Z");
        const day = 86_400_000;
        const base = { isActive: true };
        await tx.publicationGroup.createMany({
          data: [
            { ...base, name: "Zeta" },
            { ...base, name: "Alfa", startsAt: new Date(now.getTime() - day) },
            { ...base, name: "Soon", startsAt: new Date(now.getTime() + day) },
            { ...base, name: "Over", endsAt: new Date(now.getTime() - day) },
            { name: "Off", isActive: false },
          ],
        });
        expect(await getActiveGroupNames(tx, now)).toEqual(["Alfa", "Zeta"]);
        await tx.publicationGroup.updateMany({ data: { isActive: false } });
        expect(await getActiveGroupNames(tx, now)).toEqual([]);
      });
    });
  });

  describe("getGroupCandidates", () => {
    it("lists the products of a lot with the stock each size leaves free", async () => {
      await withRollback(async (tx) => {
        const { lot, vestido, top, variant } = await fixture(tx);
        const other = await tx.publicationGroup.create({
          data: {
            name: "Otro",
            isActive: true,
            allocations: {
              create: [{ variantId: variant(vestido, "S").id, allocated: 4, sold: 1 }],
            },
          },
        });
        const group = await tx.publicationGroup.create({
          data: {
            name: "Destino",
            allocations: { create: [{ variantId: top.variants[0]?.id as string, allocated: 1 }] },
          },
        });
        const candidates = await getGroupCandidates(tx, group.id, { lotId: lot.id }, NOW);
        expect(candidates.map((candidate) => candidate.name)).toEqual(["Top", "Vestido"]);
        const vest = candidates.find((candidate) => candidate.id === vestido.id);
        expect(vest).toMatchObject({ inGroup: false, lotName: lot.name, imageUrl: null });
        // S has 3 held by the other active group.
        expect(vest?.sizes).toEqual([
          { size: "S", free: 7 },
          { size: "M", free: 4 },
        ]);
        expect(candidates.find((candidate) => candidate.id === top.id)?.inGroup).toBe(true);
        expect(other.id).not.toBe(group.id);
      });
    });

    it("filters by brand and category and returns nothing without a filter", async () => {
      await withRollback(async (tx) => {
        const { vestido, top } = await fixture(tx);
        const brand = await ensureBrand(tx, "Zz Cand");
        await tx.product.update({
          where: { id: vestido.id },
          data: { brand: "zz cand", category: "remeras" },
        });
        await tx.product.update({ where: { id: top.id }, data: { brand: null } });
        const group = await tx.publicationGroup.create({ data: { name: "Destino" } });
        const byBrand = await getGroupCandidates(tx, group.id, { brand: brand.slug }, NOW);
        expect(byBrand.map((candidate) => candidate.id)).toEqual([vestido.id]);
        const loose = await getGroupCandidates(tx, group.id, { brand: "otras-marcas" }, NOW);
        expect(loose.map((candidate) => candidate.id)).toContain(top.id);
        expect(loose.map((candidate) => candidate.id)).not.toContain(vestido.id);
        expect(await getGroupCandidates(tx, group.id, { brand: "no-such-brand" }, NOW)).toEqual([]);
        const byCategory = await getGroupCandidates(tx, group.id, { category: "remeras" }, NOW);
        expect(byCategory.map((candidate) => candidate.id)).toContain(vestido.id);
        expect(await getGroupCandidates(tx, group.id, {}, NOW)).toEqual([]);
        expect(await getGroupCandidates(tx, "nope", { brand: brand.slug }, NOW)).toEqual([]);
      });
    });
  });
});
