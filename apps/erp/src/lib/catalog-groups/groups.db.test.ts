import type { Prisma } from "@atika/db";
import { afterAll, describe, expect, it } from "vitest";
import {
  createFixtureLot,
  dbOver,
  disconnectTestDb,
  hasDatabase,
  withRollback,
} from "../../test/db";
import {
  activateGroup,
  addProductsToGroup,
  createGroup,
  deactivateGroup,
  deleteGroup,
  removeProductFromGroup,
  setGroupAllocations,
  updateGroup,
} from "./groups";

const NOW = new Date("2026-10-22T15:00:00.000Z");

describe.skipIf(!hasDatabase)("catalog groups (database)", () => {
  afterAll(disconnectTestDb);

  /** One lot with two products: A has sizes S (stock 10) and M (stock 4), B has size U (stock 0). */
  async function fixture(tx: Prisma.TransactionClient) {
    const { lot, products } = await createFixtureLot(tx, [
      {
        name: "A",
        originalValueUsd: 10,
        variants: [
          ["S", 10, 10],
          ["M", 4, 4],
        ],
      },
      { name: "B", originalValueUsd: 10, variants: [["U", 3, 0]] },
    ]);
    const [a, b] = products as [(typeof products)[number], (typeof products)[number]];
    const variant = (product: typeof a, size: string) => {
      const found = product.variants.find((candidate) => candidate.size === size);
      if (!found) throw new Error(`missing size ${size}`);
      return found;
    };
    return { lot, a, b, variant };
  }

  async function newGroup(tx: Prisma.TransactionClient, name = "Verano") {
    const outcome = await createGroup(dbOver(tx), { name });
    if (!outcome.groupId) throw new Error("group not created");
    return outcome.groupId;
  }

  describe("createGroup / updateGroup", () => {
    it("creates an inactive group with its window", async () => {
      await withRollback(async (tx) => {
        const outcome = await createGroup(dbOver(tx), {
          name: "Verano",
          startsAt: "2026-11-01T08:00",
          endsAt: "",
        });
        expect(outcome.state.status).toBe("success");
        const group = await tx.publicationGroup.findUniqueOrThrow({
          where: { id: outcome.groupId },
        });
        expect(group).toMatchObject({ name: "Verano", isActive: false, endsAt: null });
        expect(group.startsAt).toEqual(new Date("2026-11-01T08:00"));
      });
    });

    it("returns field errors without creating anything", async () => {
      await withRollback(async (tx) => {
        const outcome = await createGroup(dbOver(tx), { name: "" });
        expect(outcome.state).toMatchObject({
          status: "error",
          fieldErrors: { name: expect.any(String) },
        });
        expect(outcome.groupId).toBeUndefined();
      });
    });

    it("renames a group and changes its window", async () => {
      await withRollback(async (tx) => {
        const id = await newGroup(tx);
        const state = await updateGroup(dbOver(tx), id, {
          name: "Invierno",
          endsAt: "2026-12-31T23:00",
        });
        expect(state.status).toBe("success");
        const group = await tx.publicationGroup.findUniqueOrThrow({ where: { id } });
        expect(group.name).toBe("Invierno");
        expect(group.endsAt).toEqual(new Date("2026-12-31T23:00"));
      });
    });

    it("reports an unknown group", async () => {
      await withRollback(async (tx) => {
        const state = await updateGroup(dbOver(tx), "01900000-0000-7000-8000-000000000001", {
          name: "X",
        });
        expect(state).toEqual({ status: "error", message: "No se encontró el grupo." });
        expect(await updateGroup(dbOver(tx), "nope", { name: "X" })).toEqual(state);
      });
    });
  });

  describe("setGroupAllocations", () => {
    it("upserts one allocation per variant", async () => {
      await withRollback(async (tx) => {
        const { a, variant } = await fixture(tx);
        const id = await newGroup(tx);
        const s = variant(a, "S");
        await setGroupAllocations(dbOver(tx), id, [{ variantId: s.id, allocated: 3 }], NOW);
        await setGroupAllocations(dbOver(tx), id, [{ variantId: s.id, allocated: 6 }], NOW);
        const rows = await tx.groupAllocation.findMany({ where: { groupId: id } });
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ variantId: s.id, allocated: 6, sold: 0 });
      });
    });

    it("quantity 0 removes the allocation when nothing was sold", async () => {
      await withRollback(async (tx) => {
        const { a, variant } = await fixture(tx);
        const id = await newGroup(tx);
        const s = variant(a, "S");
        await setGroupAllocations(dbOver(tx), id, [{ variantId: s.id, allocated: 3 }], NOW);
        await setGroupAllocations(dbOver(tx), id, [{ variantId: s.id, allocated: 0 }], NOW);
        expect(await tx.groupAllocation.count({ where: { groupId: id } })).toBe(0);
      });
    });

    it("quantity 0 keeps the allocation at what was sold", async () => {
      await withRollback(async (tx) => {
        const { a, variant } = await fixture(tx);
        const id = await newGroup(tx);
        const s = variant(a, "S");
        await tx.groupAllocation.create({
          data: { groupId: id, variantId: s.id, allocated: 5, sold: 2 },
        });
        const state = await setGroupAllocations(
          dbOver(tx),
          id,
          [{ variantId: s.id, allocated: 0 }],
          NOW,
        );
        expect(state.status).toBe("success");
        const row = await tx.groupAllocation.findFirstOrThrow({ where: { groupId: id } });
        expect(row).toMatchObject({ allocated: 2, sold: 2 });
      });
    });

    it("refuses a quantity below what was sold and writes nothing", async () => {
      await withRollback(async (tx) => {
        const { a, variant } = await fixture(tx);
        const id = await newGroup(tx);
        const s = variant(a, "S");
        const m = variant(a, "M");
        await tx.groupAllocation.create({
          data: { groupId: id, variantId: s.id, allocated: 5, sold: 3 },
        });
        const state = await setGroupAllocations(
          dbOver(tx),
          id,
          [
            { variantId: m.id, allocated: 2 },
            { variantId: s.id, allocated: 2 },
          ],
          NOW,
        );
        expect(state).toMatchObject({
          status: "error",
          message: expect.stringContaining("ya vendiste 3"),
        });
        expect(await tx.groupAllocation.count({ where: { groupId: id } })).toBe(1);
      });
    });

    it("on an active group refuses more than the free stock plus its own remainder", async () => {
      await withRollback(async (tx) => {
        const { a, variant } = await fixture(tx);
        const id = await newGroup(tx);
        const m = variant(a, "M"); // stock 4
        await setGroupAllocations(dbOver(tx), id, [{ variantId: m.id, allocated: 3 }], NOW);
        await activateGroup(dbOver(tx), id);
        const tooMany = await setGroupAllocations(
          dbOver(tx),
          id,
          [{ variantId: m.id, allocated: 5 }],
          NOW,
        );
        expect(tooMany).toMatchObject({
          status: "error",
          message: expect.stringContaining("hasta 4"),
        });
        const ok = await setGroupAllocations(
          dbOver(tx),
          id,
          [{ variantId: m.id, allocated: 4 }],
          NOW,
        );
        expect(ok.status).toBe("success");
      });
    });

    it("limits the quantity by what other active groups hold", async () => {
      await withRollback(async (tx) => {
        const { a, variant } = await fixture(tx);
        const s = variant(a, "S"); // stock 10
        const other = await newGroup(tx, "Otro");
        await tx.groupAllocation.create({
          data: { groupId: other, variantId: s.id, allocated: 6, sold: 0 },
        });
        // Another group holds 6 but is not active yet: it holds nothing.
        const id = await newGroup(tx);
        await tx.publicationGroup.update({ where: { id }, data: { isActive: true } });
        expect(
          (await setGroupAllocations(dbOver(tx), id, [{ variantId: s.id, allocated: 10 }], NOW))
            .status,
        ).toBe("success");
        await tx.publicationGroup.update({ where: { id: other }, data: { isActive: true } });
        const state = await setGroupAllocations(
          dbOver(tx),
          id,
          [{ variantId: s.id, allocated: 5 }],
          NOW,
        );
        expect(state).toMatchObject({
          status: "error",
          message: expect.stringContaining("hasta 4"),
        });
      });
    });

    it("refuses an unknown variant", async () => {
      await withRollback(async (tx) => {
        const id = await newGroup(tx);
        const state = await setGroupAllocations(
          dbOver(tx),
          id,
          [{ variantId: "01900000-0000-7000-8000-000000000009", allocated: 1 }],
          NOW,
        );
        expect(state.status).toBe("error");
      });
    });
  });

  describe("addProductsToGroup", () => {
    it("adds only the chosen products by id", async () => {
      await withRollback(async (tx) => {
        const { a, b, variant } = await fixture(tx);
        const id = await newGroup(tx);
        const state = await addProductsToGroup(dbOver(tx), id, { productIds: [a.id, b.id] }, NOW);
        expect(state).toMatchObject({ status: "success" });
        const rows = await tx.groupAllocation.findMany({ where: { groupId: id } });
        expect(rows.map((row) => row.variantId).sort()).toEqual(
          [variant(a, "S").id, variant(a, "M").id].sort(),
        );
      });
    });

    it("assigns the free stock of every size of the lot and skips sizes without it", async () => {
      await withRollback(async (tx) => {
        const { lot, a, variant } = await fixture(tx);
        const id = await newGroup(tx);
        const state = await addProductsToGroup(dbOver(tx), id, { lotId: lot.id }, NOW);
        expect(state).toMatchObject({ status: "success" });
        const rows = await tx.groupAllocation.findMany({ where: { groupId: id } });
        expect(rows.map((row) => [row.variantId, row.allocated, row.sold]).sort()).toEqual(
          [
            [variant(a, "S").id, 10, 0],
            [variant(a, "M").id, 4, 0],
          ].sort(),
        );
      });
    });

    it("assigns only what other active groups leave free", async () => {
      await withRollback(async (tx) => {
        const { lot, a, variant } = await fixture(tx);
        const other = await newGroup(tx, "Otro");
        await tx.groupAllocation.create({
          data: { groupId: other, variantId: variant(a, "S").id, allocated: 7, sold: 2 },
        });
        await tx.publicationGroup.update({ where: { id: other }, data: { isActive: true } });
        const id = await newGroup(tx);
        await addProductsToGroup(dbOver(tx), id, { lotId: lot.id }, NOW);
        const s = await tx.groupAllocation.findFirstOrThrow({
          where: { groupId: id, variantId: variant(a, "S").id },
        });
        expect(s.allocated).toBe(5);
      });
    });

    it("does not overwrite a size already assigned to the group", async () => {
      await withRollback(async (tx) => {
        const { lot, a, variant } = await fixture(tx);
        const id = await newGroup(tx);
        await setGroupAllocations(
          dbOver(tx),
          id,
          [{ variantId: variant(a, "S").id, allocated: 2 }],
          NOW,
        );
        await addProductsToGroup(dbOver(tx), id, { lotId: lot.id }, NOW);
        const s = await tx.groupAllocation.findFirstOrThrow({
          where: { groupId: id, variantId: variant(a, "S").id },
        });
        expect(s.allocated).toBe(2);
      });
    });

    it("proposes one unit per size", async () => {
      await withRollback(async (tx) => {
        const { a, variant } = await fixture(tx);
        const id = await newGroup(tx);
        const state = await addProductsToGroup(dbOver(tx), id, { productIds: [a.id] }, NOW, "one");
        expect(state).toMatchObject({ status: "success" });
        const rows = await tx.groupAllocation.findMany({ where: { groupId: id } });
        expect(rows.map((row) => [row.variantId, row.allocated]).sort()).toEqual(
          [
            [variant(a, "S").id, 1],
            [variant(a, "M").id, 1],
          ].sort(),
        );
      });
    });

    it("adds the sizes with nothing assigned when the proposal is zero", async () => {
      await withRollback(async (tx) => {
        const { a } = await fixture(tx);
        const id = await newGroup(tx);
        const state = await addProductsToGroup(dbOver(tx), id, { productIds: [a.id] }, NOW, "zero");
        expect(state).toMatchObject({ status: "success" });
        const rows = await tx.groupAllocation.findMany({ where: { groupId: id } });
        expect(rows).toHaveLength(2);
        expect(rows.every((row) => row.allocated === 0 && row.sold === 0)).toBe(true);
      });
    });

    it("filters by catalog, category and brand", async () => {
      await withRollback(async (tx) => {
        const { lot, a, b } = await fixture(tx);
        await tx.product.update({
          where: { id: a.id },
          data: { brand: "Zz Brand", category: "remeras" },
        });
        await tx.product.update({
          where: { id: b.id },
          data: { brand: "Zz Other", catalog: "milonga" },
        });
        const byBrand = await newGroup(tx, "brand");
        await addProductsToGroup(dbOver(tx), byBrand, { brand: "Zz Brand" }, NOW);
        expect(await tx.groupAllocation.count({ where: { groupId: byBrand } })).toBe(2);
        const byLotAndCategory = await newGroup(tx, "cat");
        await addProductsToGroup(
          dbOver(tx),
          byLotAndCategory,
          { lotId: lot.id, category: "remeras" },
          NOW,
        );
        expect(await tx.groupAllocation.count({ where: { groupId: byLotAndCategory } })).toBe(2);
        const byCatalog = await newGroup(tx, "catalog");
        await tx.productVariant.updateMany({ where: { productId: b.id }, data: { stock: 2 } });
        await addProductsToGroup(dbOver(tx), byCatalog, { lotId: lot.id, catalog: "milonga" }, NOW);
        expect(await tx.groupAllocation.count({ where: { groupId: byCatalog } })).toBe(1);
      });
    });

    it("needs a filter", async () => {
      await withRollback(async (tx) => {
        const id = await newGroup(tx);
        const state = await addProductsToGroup(dbOver(tx), id, {}, NOW);
        expect(state).toEqual({
          status: "error",
          message: "Elegí un lote, catálogo, categoría o marca.",
        });
      });
    });

    it("says so when nothing could be added", async () => {
      await withRollback(async (tx) => {
        const { b } = await fixture(tx);
        const id = await newGroup(tx);
        await tx.product.update({ where: { id: b.id }, data: { brand: "Zz Empty" } });
        const state = await addProductsToGroup(dbOver(tx), id, { brand: "Zz Empty" }, NOW);
        expect(state).toMatchObject({
          status: "error",
          message: expect.stringContaining("stock libre"),
        });
      });
    });
  });

  describe("activateGroup / deactivateGroup / deleteGroup", () => {
    it("activates a group with assigned stock and deactivates it", async () => {
      await withRollback(async (tx) => {
        const { a, variant } = await fixture(tx);
        const id = await newGroup(tx);
        await setGroupAllocations(
          dbOver(tx),
          id,
          [{ variantId: variant(a, "S").id, allocated: 3 }],
          NOW,
        );
        expect((await activateGroup(dbOver(tx), id)).status).toBe("success");
        expect((await tx.publicationGroup.findUniqueOrThrow({ where: { id } })).isActive).toBe(
          true,
        );
        expect((await deactivateGroup(dbOver(tx), id)).status).toBe("success");
        expect((await tx.publicationGroup.findUniqueOrThrow({ where: { id } })).isActive).toBe(
          false,
        );
      });
    });

    it("never touches the physical stock", async () => {
      await withRollback(async (tx) => {
        const { a, variant } = await fixture(tx);
        const id = await newGroup(tx);
        const s = variant(a, "S");
        await setGroupAllocations(dbOver(tx), id, [{ variantId: s.id, allocated: 3 }], NOW);
        await activateGroup(dbOver(tx), id);
        await deactivateGroup(dbOver(tx), id);
        expect((await tx.productVariant.findUniqueOrThrow({ where: { id: s.id } })).stock).toBe(10);
      });
    });

    it("refuses an empty group", async () => {
      await withRollback(async (tx) => {
        const id = await newGroup(tx);
        expect(await activateGroup(dbOver(tx), id)).toEqual({
          status: "error",
          message: "Asigná stock a al menos un talle antes de activar el grupo.",
        });
      });
    });

    it("refuses when a variant is already in another active group", async () => {
      await withRollback(async (tx) => {
        const { a, variant } = await fixture(tx);
        const s = variant(a, "S");
        const first = await newGroup(tx, "Primero");
        const second = await newGroup(tx, "Segundo");
        await setGroupAllocations(dbOver(tx), first, [{ variantId: s.id, allocated: 3 }], NOW);
        await setGroupAllocations(dbOver(tx), second, [{ variantId: s.id, allocated: 2 }], NOW);
        await activateGroup(dbOver(tx), first);
        const state = await activateGroup(dbOver(tx), second);
        expect(state).toMatchObject({
          status: "error",
          message: expect.stringContaining("Primero"),
        });
        expect(
          (await tx.publicationGroup.findUniqueOrThrow({ where: { id: second } })).isActive,
        ).toBe(false);
      });
    });

    it("refuses when an allocation exceeds the free stock", async () => {
      await withRollback(async (tx) => {
        const { a, variant } = await fixture(tx);
        const m = variant(a, "M"); // stock 4
        const id = await newGroup(tx);
        await setGroupAllocations(dbOver(tx), id, [{ variantId: m.id, allocated: 4 }], NOW);
        await tx.productVariant.update({ where: { id: m.id }, data: { stock: 1 } });
        const state = await activateGroup(dbOver(tx), id);
        expect(state).toMatchObject({
          status: "error",
          message: expect.stringContaining("hasta 1"),
        });
      });
    });

    it("deletes only inactive groups, with their allocations", async () => {
      await withRollback(async (tx) => {
        const { a, variant } = await fixture(tx);
        const id = await newGroup(tx);
        await setGroupAllocations(
          dbOver(tx),
          id,
          [{ variantId: variant(a, "S").id, allocated: 3 }],
          NOW,
        );
        await activateGroup(dbOver(tx), id);
        expect(await deleteGroup(dbOver(tx), id)).toEqual({
          status: "error",
          message: "Desactivá el grupo antes de eliminarlo.",
        });
        await deactivateGroup(dbOver(tx), id);
        expect((await deleteGroup(dbOver(tx), id)).status).toBe("success");
        expect(await tx.publicationGroup.count({ where: { id } })).toBe(0);
        expect(await tx.groupAllocation.count({ where: { groupId: id } })).toBe(0);
      });
    });
  });

  describe("removeProductFromGroup", () => {
    it("drops every size of the product that has no sales", async () => {
      await withRollback(async (tx) => {
        const { a, variant } = await fixture(tx);
        const id = await newGroup(tx);
        await setGroupAllocations(
          dbOver(tx),
          id,
          [
            { variantId: variant(a, "S").id, allocated: 5 },
            { variantId: variant(a, "M").id, allocated: 2 },
          ],
          NOW,
        );
        const state = await removeProductFromGroup(dbOver(tx), id, a.id, NOW);
        expect(state).toMatchObject({ status: "success" });
        expect(await tx.groupAllocation.count({ where: { groupId: id } })).toBe(0);
      });
    });

    it("keeps a size that already sold units, capped at what was sold", async () => {
      await withRollback(async (tx) => {
        const { a, variant } = await fixture(tx);
        const id = await newGroup(tx);
        await setGroupAllocations(
          dbOver(tx),
          id,
          [{ variantId: variant(a, "S").id, allocated: 5 }],
          NOW,
        );
        await tx.groupAllocation.updateMany({ where: { groupId: id }, data: { sold: 2 } });
        await removeProductFromGroup(dbOver(tx), id, a.id, NOW);
        const rows = await tx.groupAllocation.findMany({ where: { groupId: id } });
        expect(rows.map((row) => [row.allocated, row.sold])).toEqual([[2, 2]]);
      });
    });

    it("refuses an unknown group", async () => {
      await withRollback(async (tx) => {
        const { a } = await fixture(tx);
        const state = await removeProductFromGroup(
          dbOver(tx),
          "00000000-0000-4000-8000-000000000000",
          a.id,
          NOW,
        );
        expect(state).toMatchObject({ status: "error", message: "No se encontró el grupo." });
      });
    });
  });
});
