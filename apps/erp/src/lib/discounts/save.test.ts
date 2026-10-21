import { afterAll, describe, expect, it } from "vitest";
import {
  createFixtureLot,
  dbOver,
  disconnectTestDb,
  hasDatabase,
  withRollback,
} from "../../test/db";
import { deleteDiscount, saveDiscount, setDiscountActive } from "./save";

const base = { name: "Liquidación", percent: "20", scope: "all", isActive: "on" };

describe.skipIf(!hasDatabase)("discount management (database)", () => {
  afterAll(disconnectTestDb);

  it("creates a discount for every product", async () => {
    await withRollback(async (tx) => {
      const state = await saveDiscount(dbOver(tx), null, { ...base, endsAt: "2026-12-31" }, []);
      expect(state).toMatchObject({ status: "success", discountId: expect.any(String) });
      const id = "discountId" in state ? state.discountId : "";
      const row = await tx.discount.findUniqueOrThrow({
        where: { id },
        include: { products: true },
      });
      expect(row).toMatchObject({ name: "Liquidación", percent: 20, isActive: true, scope: "all" });
      expect(row.startsAt).toBeNull();
      expect(row.endsAt?.toISOString()).toBe("2026-12-31T00:00:00.000Z");
      expect(row.products).toEqual([]);
    });
  });

  it("creates a selected discount with its products and replaces them on edit", async () => {
    await withRollback(async (tx) => {
      const { products } = await createFixtureLot(tx, [
        { name: "A", originalValueUsd: 10, variants: [["M", 1, 1]] },
        { name: "B", originalValueUsd: 10, variants: [["M", 1, 1]] },
        { name: "C", originalValueUsd: 10, variants: [["M", 1, 1]] },
      ]);
      const [a, b, c] = products.map((product) => product.id);
      const created = await saveDiscount(dbOver(tx), null, { ...base, scope: "selected" }, [
        a ?? "",
        b ?? "",
      ]);
      const id = "discountId" in created ? created.discountId : "";
      const first = await tx.discountProduct.findMany({ where: { discountId: id } });
      expect(first.map((row) => row.productId).sort()).toEqual([a, b].sort());

      const edited = await saveDiscount(
        dbOver(tx),
        id,
        { ...base, name: "Nuevo", percent: "35", scope: "selected" },
        [c ?? ""],
      );
      expect(edited).toMatchObject({ status: "success" });
      const row = await tx.discount.findUniqueOrThrow({
        where: { id },
        include: { products: true },
      });
      expect(row).toMatchObject({ name: "Nuevo", percent: 35 });
      expect(row.products.map((p) => p.productId)).toEqual([c]);
    });
  });

  it("drops the product list when switching the scope to all", async () => {
    await withRollback(async (tx) => {
      const { products } = await createFixtureLot(tx, [
        { name: "A", originalValueUsd: 10, variants: [["M", 1, 1]] },
      ]);
      const created = await saveDiscount(dbOver(tx), null, { ...base, scope: "selected" }, [
        products[0]?.id ?? "",
      ]);
      const id = "discountId" in created ? created.discountId : "";
      await saveDiscount(dbOver(tx), id, base, []);
      expect(await tx.discountProduct.count({ where: { discountId: id } })).toBe(0);
    });
  });

  it("rejects invalid input without writing", async () => {
    await withRollback(async (tx) => {
      const before = await tx.discount.count();
      const state = await saveDiscount(dbOver(tx), null, { ...base, percent: "95" }, []);
      expect(state).toMatchObject({
        status: "error",
        fieldErrors: { percent: expect.any(String) },
      });
      expect(await tx.discount.count()).toBe(before);
    });
  });

  it("reports a missing discount when editing one that does not exist", async () => {
    await withRollback(async (tx) => {
      const state = await saveDiscount(
        dbOver(tx),
        "0190f3a0-0000-7000-8000-00000000dead",
        base,
        [],
      );
      expect(state).toMatchObject({ status: "error", message: "No se encontró el descuento." });
    });
  });

  it("toggles the active flag", async () => {
    await withRollback(async (tx) => {
      const created = await saveDiscount(dbOver(tx), null, base, []);
      const id = "discountId" in created ? created.discountId : "";
      expect(await setDiscountActive(dbOver(tx), id, false)).toMatchObject({ status: "success" });
      expect((await tx.discount.findUniqueOrThrow({ where: { id } })).isActive).toBe(false);
      expect(await setDiscountActive(dbOver(tx), "bad", true)).toMatchObject({ status: "error" });
    });
  });

  it("deletes a discount and its product links, keeping the products", async () => {
    await withRollback(async (tx) => {
      const { products } = await createFixtureLot(tx, [
        { name: "A", originalValueUsd: 10, variants: [["M", 1, 1]] },
      ]);
      const productId = products[0]?.id ?? "";
      const created = await saveDiscount(dbOver(tx), null, { ...base, scope: "selected" }, [
        productId,
      ]);
      const id = "discountId" in created ? created.discountId : "";
      expect(await deleteDiscount(dbOver(tx), id)).toMatchObject({ status: "success" });
      expect(await tx.discount.findUnique({ where: { id } })).toBeNull();
      expect(await tx.discountProduct.count({ where: { discountId: id } })).toBe(0);
      expect(await tx.product.findUnique({ where: { id: productId } })).not.toBeNull();
      expect(await deleteDiscount(dbOver(tx), id)).toMatchObject({ status: "error" });
    });
  });
});
