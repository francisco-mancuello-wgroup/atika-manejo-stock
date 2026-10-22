import { afterAll, describe, expect, it } from "vitest";
import { createFixtureLot, disconnectTestDb, hasDatabase, withRollback } from "../../test/db";
import {
  getActiveDiscountRules,
  getDiscountForEdit,
  getDiscountList,
  getPickerProducts,
} from "./discounts";
import { getSellableProducts } from "./sales";

describe.skipIf(!hasDatabase)("discount queries (database)", () => {
  afterAll(disconnectTestDb);

  it("lists discounts with scope, dates and product counts, newest first", async () => {
    await withRollback(async (tx) => {
      const { products } = await createFixtureLot(tx, [
        { name: "A", originalValueUsd: 10, variants: [["M", 1, 1]] },
        { name: "B", originalValueUsd: 10, variants: [["M", 1, 1]] },
      ]);
      await tx.discount.create({
        data: { name: "Todo", percent: 10, scope: "all", createdAt: new Date("2030-01-01") },
      });
      const selected = await tx.discount.create({
        data: {
          name: "Algunos",
          percent: 25,
          scope: "selected",
          isActive: false,
          startsAt: new Date("2030-02-01T00:00:00.000Z"),
          endsAt: new Date("2030-02-10T00:00:00.000Z"),
          createdAt: new Date("2030-01-02"),
          products: { create: products.map((product) => ({ productId: product.id })) },
        },
      });
      const list = await getDiscountList(tx);
      expect(list[0]).toEqual({
        id: selected.id,
        name: "Algunos",
        percent: 25,
        isActive: false,
        scope: "selected",
        startsAt: "2030-02-01",
        endsAt: "2030-02-10",
        productCount: 2,
      });
      expect(list[1]).toMatchObject({
        name: "Todo",
        scope: "all",
        startsAt: null,
        productCount: 0,
      });
    });
  });

  it("reads one discount with its product ids, or null", async () => {
    await withRollback(async (tx) => {
      const { products } = await createFixtureLot(tx, [
        { name: "A", originalValueUsd: 10, variants: [["M", 1, 1]] },
      ]);
      const discount = await tx.discount.create({
        data: {
          name: "X",
          percent: 15,
          scope: "selected",
          products: { create: [{ productId: products[0]?.id ?? "" }] },
        },
      });
      expect(await getDiscountForEdit(tx, discount.id)).toMatchObject({
        id: discount.id,
        name: "X",
        percent: 15,
        productIds: [products[0]?.id],
      });
      expect(await getDiscountForEdit(tx, "0190f3a0-0000-7000-8000-00000000dead")).toBeNull();
      expect(await getDiscountForEdit(tx, "not-a-uuid")).toBeNull();
    });
  });

  it("lists every product for the picker with lot, category, price and cover", async () => {
    await withRollback(async (tx) => {
      const { lot, products } = await createFixtureLot(tx, [
        { name: "Zzz picker", originalValueUsd: 10, priceGs: 150_000, variants: [["M", 1, 1]] },
      ]);
      await tx.product.update({
        where: { id: products[0]?.id ?? "" },
        data: {
          category: "vestidos",
          images: {
            create: [
              { url: "/p/b.webp", position: 1 },
              { url: "/p/a.webp", position: 0 },
            ],
          },
        },
      });
      const picked = (await getPickerProducts(tx)).find((p) => p.id === products[0]?.id);
      expect(picked).toEqual({
        id: products[0]?.id,
        name: "Zzz picker",
        lotId: lot.id,
        lotName: lot.name,
        category: "vestidos",
        priceGs: 150_000,
        imageUrl: "/p/a.webp",
      });
    });
  });

  it("returns the rules of active discounts for the price helpers", async () => {
    await withRollback(async (tx) => {
      const { products } = await createFixtureLot(tx, [
        { name: "A", originalValueUsd: 10, variants: [["M", 1, 1]] },
      ]);
      await tx.discount.create({
        data: { name: "Off", percent: 50, scope: "all", isActive: false },
      });
      const on = await tx.discount.create({
        data: {
          name: "On",
          percent: 30,
          scope: "selected",
          endsAt: new Date("2030-01-31T00:00:00.000Z"),
          products: { create: [{ productId: products[0]?.id ?? "" }] },
        },
      });
      const rules = await getActiveDiscountRules(tx);
      expect(rules.some((rule) => rule.percent === 50 && !rule.isActive)).toBe(false);
      expect(rules.find((rule) => rule.productIds.includes(products[0]?.id ?? ""))).toEqual({
        percent: 30,
        isActive: true,
        startsAt: null,
        endsAt: new Date("2030-01-31T00:00:00.000Z"),
        scope: "selected",
        productIds: [products[0]?.id],
      });
      expect(on.id).toBeTruthy();
    });
  });

  it("suggests the discounted price for the sale form", async () => {
    await withRollback(async (tx) => {
      await tx.discount.deleteMany();
      const { products } = await createFixtureLot(tx, [
        { name: "Con", originalValueUsd: 10, priceGs: 259_000, variants: [["M", 1, 1]] },
        { name: "Sin", originalValueUsd: 10, priceGs: 259_000, variants: [["M", 1, 1]] },
      ]);
      await tx.discount.create({
        data: {
          name: "Solo uno",
          percent: 20,
          scope: "selected",
          products: { create: [{ productId: products[0]?.id ?? "" }] },
        },
      });
      const sellable = await getSellableProducts(tx);
      const con = sellable.find((p) => p.id === products[0]?.id);
      const sin = sellable.find((p) => p.id === products[1]?.id);
      expect(con).toMatchObject({
        priceGs: 259_000,
        discountPercent: 20,
        discountedPriceGs: 207_200,
      });
      expect(sin).toMatchObject({
        priceGs: 259_000,
        discountPercent: null,
        discountedPriceGs: null,
      });
    });
  });
});
