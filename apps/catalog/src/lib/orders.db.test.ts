import { afterAll, describe, expect, it } from "vitest";
import {
  createProducts,
  disconnectTestDb,
  hasDatabase,
  withRollback as rollback,
} from "../test/db";
import { createOrder, MAX_LINES, MAX_QUANTITY } from "./orders";

/** Local data may hold live discounts or groups; switch them off inside the transaction. */
const withRollback: typeof rollback = (fn) =>
  rollback(async (tx) => {
    await tx.discount.updateMany({ data: { isActive: false } });
    await tx.publicationGroup.updateMany({ data: { isActive: false } });
    return fn(tx);
  });

const NOW = new Date("2026-10-22T15:00:00.000Z");

describe.skipIf(!hasDatabase)("createOrder (database)", () => {
  afterAll(disconnectTestDb);

  it("saves a pending order with server-side snapshots and never touches stock", async () => {
    await withRollback(async (tx) => {
      const [id] = await createProducts(tx, [
        { name: "Blusa", color: "Rojo", priceGs: 150_000, variants: [["M", 3]] },
      ]);
      const result = await createOrder(tx, [{ productId: id ?? "", size: "M", quantity: 2 }], NOW);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const order = await tx.order.findUniqueOrThrow({
        where: { id: result.id },
        include: { items: true },
      });
      expect(order.status).toBe("pending");
      expect(order.number).toBe(result.number);
      expect(order.items).toHaveLength(1);
      expect(order.items[0]).toMatchObject({
        quantity: 2,
        unitPriceGs: 150_000,
        discountPercent: null,
        productName: "Blusa",
        size: "M",
        color: "Rojo",
      });
      const variant = await tx.productVariant.findUniqueOrThrow({
        where: { id: order.items[0]?.variantId },
      });
      expect(variant.stock).toBe(3);
      expect(await tx.sale.count({ where: { variantId: variant.id } })).toBe(0);
    });
  });

  it("prices the line like the catalog does, discount included", async () => {
    await withRollback(async (tx) => {
      const [id] = await createProducts(tx, [
        { name: "Saco", priceGs: 200_000, variants: [["S", 1]] },
      ]);
      await tx.discount.create({
        data: {
          name: "Test",
          percent: 20,
          scope: "selected",
          products: { create: [{ productId: id ?? "" }] },
        },
      });
      const result = await createOrder(tx, [{ productId: id ?? "", size: "S", quantity: 1 }], NOW);
      if (!result.ok) throw new Error(result.reason);
      const [item] = await tx.orderItem.findMany({ where: { orderId: result.id } });
      expect(item).toMatchObject({ unitPriceGs: 160_000, discountPercent: 20 });
    });
  });

  it("charges the event price of a size held by the active group, like Pink shows it", async () => {
    await withRollback(async (tx) => {
      const [id = ""] = await createProducts(tx, [
        {
          name: "Lia Dress",
          priceGs: 1_584_000,
          variants: [
            ["S", 1],
            ["M", 1],
          ],
        },
      ]);
      const variants = await tx.productVariant.findMany({ where: { productId: id } });
      const sizeId = (size: string) => variants.find((variant) => variant.size === size)?.id ?? "";
      await tx.discount.create({
        data: {
          name: "Test",
          percent: 10,
          scope: "selected",
          products: { create: [{ productId: id }] },
        },
      });
      await tx.publicationGroup.create({
        data: {
          name: "Pink test",
          isActive: true,
          allocations: {
            create: [
              { variantId: sizeId("S"), allocated: 1, priceGs: 1_553_000 },
              { variantId: sizeId("M"), allocated: 1 },
            ],
          },
        },
      });
      const result = await createOrder(
        tx,
        [
          { productId: id, size: "S", quantity: 1 },
          { productId: id, size: "M", quantity: 1 },
        ],
        NOW,
      );
      if (!result.ok) throw new Error(result.reason);
      const items = await tx.orderItem.findMany({ where: { orderId: result.id } });
      const bySize = Object.fromEntries(items.map((item) => [item.size, item]));
      expect(bySize.S).toMatchObject({ unitPriceGs: 1_553_000, discountPercent: null });
      expect(bySize.M).toMatchObject({ unitPriceGs: 1_425_600, discountPercent: 10 });
    });
  });

  it("merges repeated lines of the same piece and size", async () => {
    await withRollback(async (tx) => {
      const [id] = await createProducts(tx, [{ name: "Pollera", variants: [["M", 5]] }]);
      const line = { productId: id ?? "", size: "M", quantity: 2 };
      const result = await createOrder(tx, [line, line], NOW);
      if (!result.ok) throw new Error(result.reason);
      const items = await tx.orderItem.findMany({ where: { orderId: result.id } });
      expect(items.map((item) => item.quantity)).toEqual([4]);
    });
  });

  it("rejects unknown, hidden and sold-out pieces without saving anything", async () => {
    await withRollback(async (tx) => {
      const [live, hidden, soldOut] = await createProducts(tx, [
        { name: "Live", variants: [["M", 1]] },
        { name: "Hidden", isPublished: false, variants: [["M", 1]] },
        { name: "Out", variants: [["M", 0]] },
      ]);
      const before = await tx.order.count();
      const bad = [
        { productId: "00000000-0000-4000-8000-000000000000", size: "M", quantity: 1 },
        { productId: "not-a-uuid", size: "M", quantity: 1 },
        { productId: live ?? "", size: "XL", quantity: 1 },
        { productId: hidden ?? "", size: "M", quantity: 1 },
        { productId: soldOut ?? "", size: "M", quantity: 1 },
      ];
      for (const line of bad) {
        const good = { productId: live ?? "", size: "M", quantity: 1 };
        expect(await createOrder(tx, [good, line], NOW)).toEqual({
          ok: false,
          reason: "unavailable",
        });
      }
      expect(await tx.order.count()).toBe(before);
    });
  });

  it("rejects malformed input and over-limit orders", async () => {
    await withRollback(async (tx) => {
      const [id] = await createProducts(tx, [{ name: "Ok", variants: [["M", 50]] }]);
      const line = (quantity: unknown) => ({ productId: id ?? "", size: "M", quantity });
      expect(await createOrder(tx, [], NOW)).toEqual({ ok: false, reason: "empty" });
      expect(await createOrder(tx, "nope", NOW)).toEqual({ ok: false, reason: "empty" });
      for (const quantity of [0, -1, 1.5, "2", MAX_QUANTITY + 1]) {
        expect(await createOrder(tx, [line(quantity)], NOW)).toEqual({
          ok: false,
          reason: "invalid_line",
        });
      }
      // Same piece twice: the merged quantity is what is limited.
      expect(await createOrder(tx, [line(MAX_QUANTITY), line(1)], NOW)).toEqual({
        ok: false,
        reason: "invalid_line",
      });
      expect(await createOrder(tx, [line(1), { size: "M", quantity: 1 }], NOW)).toEqual({
        ok: false,
        reason: "invalid_line",
      });
      const many = Array.from({ length: MAX_LINES + 1 }, () => line(1));
      expect(await createOrder(tx, many, NOW)).toEqual({ ok: false, reason: "too_many_lines" });
    });
  });

  it("is rejected while the store hides prices (there is no price to record)", async () => {
    await withRollback(async (tx) => {
      const [id] = await createProducts(tx, [{ name: "Secret", variants: [["M", 1]] }]);
      await tx.catalogSettings.upsert({
        where: { id: 1 },
        create: {
          id: 1,
          whatsappNumber: "0",
          messageTemplate: "m",
          heroText: "h",
          showPrices: false,
        },
        update: { showPrices: false },
      });
      const result = await createOrder(tx, [{ productId: id ?? "", size: "M", quantity: 1 }], NOW);
      expect(result).toEqual({ ok: false, reason: "prices_hidden" });
    });
  });
});
