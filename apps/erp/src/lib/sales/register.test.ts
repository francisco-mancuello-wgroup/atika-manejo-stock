import type { Prisma } from "@atika/db";
import { afterAll, describe, expect, it, vi } from "vitest";
import {
  createFixtureLot,
  dbOver,
  disconnectTestDb,
  hasDatabase,
  withRollback,
} from "../../test/db";
import { registerSale, registerSaleFromForm, type SaleTx } from "./register";

const input = {
  productId: "01900000-0000-7000-8000-000000000001",
  size: "M",
  quantity: 2,
  soldAt: "2026-10-21",
  chargedGs: undefined,
  customer: undefined,
  notes: undefined,
};

function fakeTx(options: { variant?: object | null; updated?: number }) {
  const variant =
    options.variant === undefined
      ? { id: "v1", stock: 3, product: { priceGs: 500_000, lotId: "lot-1" } }
      : options.variant;
  const updateMany = vi.fn(async () => ({ count: options.updated ?? 1 }));
  const create = vi.fn(async () => ({ id: "sale-1" }));
  const tx = {
    productVariant: { findUnique: vi.fn(async () => variant), updateMany },
    sale: { create },
  } as unknown as SaleTx;
  return { tx, updateMany, create };
}

describe("registerSale (stock guard)", () => {
  it("decrements stock conditionally and records the sale at the product list price", async () => {
    const { tx, updateMany, create } = fakeTx({});
    const result = await registerSale(tx, input);
    expect(result).toEqual({ ok: true, saleId: "sale-1", lotId: "lot-1", remainingStock: 1 });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "v1", stock: { gte: 2 } },
      data: { stock: { decrement: 2 } },
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ variantId: "v1", quantity: 2, listPriceGs: 500_000 }),
    });
  });

  it("refuses when the conditional update matches nothing and creates no sale", async () => {
    const { tx, create } = fakeTx({ updated: 0 });
    const result = await registerSale(tx, input);
    expect(result).toEqual({ ok: false, reason: "out_of_stock", available: 3 });
    expect(create).not.toHaveBeenCalled();
  });

  it("refuses an unknown product/size combination", async () => {
    const { tx, updateMany } = fakeTx({ variant: null });
    expect(await registerSale(tx, input)).toEqual({ ok: false, reason: "variant_not_found" });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("stores the charged price only when given", async () => {
    const { tx, create } = fakeTx({});
    await registerSale(tx, { ...input, chargedGs: 450_000, customer: "Ana" });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ chargedGs: 450_000, customer: "Ana" }),
    });
  });
});

describe.skipIf(!hasDatabase)("registerSale (database)", () => {
  afterAll(disconnectTestDb);

  async function fixture(tx: Prisma.TransactionClient, stock: number) {
    const { products } = await createFixtureLot(tx, [
      { name: "Sale test", originalValueUsd: 50, priceGs: 320_000, variants: [["M", 5, stock]] },
    ]);
    return products[0] as NonNullable<(typeof products)[number]>;
  }

  it("creates the sale and decrements stock in the same transaction", async () => {
    await withRollback(async (tx) => {
      const product = await fixture(tx, 3);
      const result = await registerSale(tx, { ...input, productId: product.id, quantity: 2 });
      expect(result).toMatchObject({ ok: true, remainingStock: 1 });

      const variant = await tx.productVariant.findFirstOrThrow({
        where: { productId: product.id },
      });
      expect(variant.stock).toBe(1);
      const sale = await tx.sale.findFirstOrThrow({ where: { variantId: variant.id } });
      expect(sale).toMatchObject({ quantity: 2, listPriceGs: 320_000, chargedGs: null });
      expect(sale.soldAt.toISOString()).toBe("2026-10-21T00:00:00.000Z");
    });
  });

  it("never lets stock go negative and leaves no sale behind", async () => {
    await withRollback(async (tx) => {
      const product = await fixture(tx, 1);
      const result = await registerSale(tx, { ...input, productId: product.id, quantity: 2 });
      expect(result).toEqual({ ok: false, reason: "out_of_stock", available: 1 });

      const variant = await tx.productVariant.findFirstOrThrow({
        where: { productId: product.id },
      });
      expect(variant.stock).toBe(1);
      expect(await tx.sale.count({ where: { variantId: variant.id } })).toBe(0);
    });
  });

  it("allows selling exactly the remaining stock", async () => {
    await withRollback(async (tx) => {
      const product = await fixture(tx, 2);
      const result = await registerSale(tx, { ...input, productId: product.id, quantity: 2 });
      expect(result).toMatchObject({ ok: true, remainingStock: 0 });
    });
  });
});

describe.skipIf(!hasDatabase)("registerSaleFromForm (database)", () => {
  afterAll(disconnectTestDb);

  it("turns an out of stock result into a clear message and keeps the typed values", async () => {
    await withRollback(async (tx) => {
      const { products } = await createFixtureLot(tx, [
        { name: "Form test", originalValueUsd: 50, variants: [["M", 5, 1]] },
      ]);
      const raw = {
        productId: products[0]?.id ?? "",
        size: "M",
        quantity: "3",
        soldAt: "2026-10-21",
        chargedGs: "",
        customer: "",
        notes: "",
      };
      const outcome = await registerSaleFromForm(dbOver(tx), raw);
      expect(outcome.lotId).toBeUndefined();
      expect(outcome.state).toMatchObject({
        status: "error",
        message: "No hay stock suficiente en el talle M: queda 1 unidad.",
        values: raw,
      });
    });
  });

  it("registers the sale and reports the lot to revalidate", async () => {
    await withRollback(async (tx) => {
      const { lot, products } = await createFixtureLot(tx, [
        { name: "Form test", originalValueUsd: 50, variants: [["M", 5, 4]] },
      ]);
      const outcome = await registerSaleFromForm(dbOver(tx), {
        productId: products[0]?.id ?? "",
        size: "M",
        quantity: "1",
        soldAt: "2026-10-21",
        chargedGs: "",
        customer: "Ana",
        notes: "",
      });
      expect(outcome.state).toEqual({
        status: "success",
        message: "Venta registrada. Quedan 3 en talle M.",
      });
      expect(outcome.lotId).toBe(lot.id);
    });
  });

  it("returns field errors without touching the database", async () => {
    await withRollback(async (tx) => {
      const outcome = await registerSaleFromForm(dbOver(tx), {
        productId: "",
        size: "",
        quantity: "0",
        soldAt: "",
        chargedGs: "",
        customer: "",
        notes: "",
      });
      expect(outcome.state).toMatchObject({
        status: "error",
        fieldErrors: { quantity: expect.any(String) },
      });
    });
  });
});
