import { afterAll, describe, expect, it } from "vitest";
import { createFixtureLot, disconnectTestDb, hasDatabase, withRollback } from "../../test/db";
import {
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
        },
        {
          variantId: variant(vestido, "M").id,
          size: "M",
          stock: 4,
          free: 4,
          allocated: 3,
          sold: 1,
          remaining: 2,
        },
      ]);
      expect(detail?.preview).toEqual({ products: 1, units: 2 });
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
      await tx.product.update({ where: { id: vestido.id }, data: { brand: "Zeta q-opt" } });
      const options = await getGroupOptions(tx);
      expect(options.lots).toContainEqual({ id: lot.id, name: lot.name });
      expect(options.brands).toContain("Zeta q-opt");
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
});
