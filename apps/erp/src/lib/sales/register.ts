import type { Prisma } from "@atika/db";
import { applyDiscount, effectiveDiscount } from "@atika/pricing";
import type { FormState } from "../action-state";
import { activeGroupWhere, remaining as groupRemaining } from "../catalog-groups/stock";
import { toDbDate } from "../dates";
import type { TransactionRunner } from "../lots/save";
import { getActiveDiscountRules } from "../queries/discounts";
import { parseSale, type SaleInput } from "./schema";

/** The part of a transaction the sale needs (a subset of Prisma's transaction client). */
export type SaleTx = Pick<
  Prisma.TransactionClient,
  "productVariant" | "sale" | "discount" | "groupAllocation"
>;

export type RegisterSaleResult =
  | { ok: true; saleId: string; lotId: string; remainingStock: number }
  | { ok: false; reason: "variant_not_found" }
  | { ok: false; reason: "out_of_stock"; available: number };

/**
 * Sale + stock decrement; the sale records the discounted price when a discount applies. The decrement is a conditional update (`stock >= quantity`), so two
 * concurrent sales can never push stock below zero; when it matches no row nothing is written.
 * When the variant sits in a publication group that is active at `now` (the moment the sale is registered), the sale
 * consumes the group's remainder first: its `sold` counter grows by min(quantity, remainder) in the same transaction.
 * Run it inside a transaction so a failure after the decrement rolls everything back.
 */
export async function registerSale(
  tx: SaleTx,
  input: SaleInput,
  now: Date = new Date(),
): Promise<RegisterSaleResult> {
  const variant = await tx.productVariant.findUnique({
    where: { productId_size: { productId: input.productId, size: input.size } },
    include: { product: { select: { priceGs: true, lotId: true } } },
  });
  if (!variant) return { ok: false, reason: "variant_not_found" };

  const decremented = await tx.productVariant.updateMany({
    where: { id: variant.id, stock: { gte: input.quantity } },
    data: { stock: { decrement: input.quantity } },
  });
  if (decremented.count === 0) {
    return { ok: false, reason: "out_of_stock", available: variant.stock };
  }

  await consumeGroupStock(tx, variant.id, variant.stock, input.quantity, now);

  // The list price of the sale is what the shop asks today: the discounted price if one applies.
  const percent = effectiveDiscount(await getActiveDiscountRules(tx), input.productId, now);
  const listPriceGs =
    percent === null ? variant.product.priceGs : applyDiscount(variant.product.priceGs, percent);

  const sale = await tx.sale.create({
    data: {
      variantId: variant.id,
      quantity: input.quantity,
      soldAt: toDbDate(input.soldAt),
      listPriceGs,
      // Charging exactly the list price is the same as not overriding it.
      chargedGs: input.chargedGs === listPriceGs ? null : (input.chargedGs ?? null),
      customer: input.customer ?? null,
      notes: input.notes ?? null,
    },
  });
  return {
    ok: true,
    saleId: sale.id,
    lotId: variant.product.lotId,
    remainingStock: variant.stock - input.quantity,
  };
}

/** Counts the sold units against the variant's active group allocation (a variant has at most one). */
async function consumeGroupStock(
  tx: SaleTx,
  variantId: string,
  stockBefore: number,
  quantity: number,
  now: Date,
): Promise<void> {
  const allocation = await tx.groupAllocation.findFirst({
    where: { variantId, group: activeGroupWhere(now) },
  });
  if (!allocation) return;
  const consumed = Math.min(
    quantity,
    groupRemaining(allocation.allocated, allocation.sold, stockBefore),
  );
  if (consumed === 0) return;
  await tx.groupAllocation.update({
    where: { id: allocation.id },
    data: { sold: { increment: consumed } },
  });
}

function remaining(count: number): string {
  return count === 1 ? "queda 1 unidad" : `quedan ${count} unidades`;
}

export interface SaleOutcome {
  state: FormState;
  /** Lot whose detail page must be revalidated; only set when the sale was recorded. */
  lotId?: string;
}

/** Validates the form values, then registers the sale in one transaction. */
export async function registerSaleFromForm(
  db: TransactionRunner,
  raw: Record<string, string>,
): Promise<SaleOutcome> {
  const parsed = parseSale(raw);
  if (!parsed.success) {
    return {
      state: {
        status: "error",
        message: "Revisá los campos marcados.",
        fieldErrors: parsed.fieldErrors,
        values: raw,
      },
    };
  }

  const result = await db.$transaction((tx) => registerSale(tx, parsed.data));
  if (result.ok) {
    const left = result.remainingStock === 1 ? "Queda 1" : `Quedan ${result.remainingStock}`;
    return {
      lotId: result.lotId,
      state: {
        status: "success",
        message: `Venta registrada. ${left} en talle ${parsed.data.size}.`,
      },
    };
  }
  if (result.reason === "out_of_stock") {
    return {
      state: {
        status: "error",
        message: `No hay stock suficiente en el talle ${parsed.data.size}: ${remaining(result.available)}.`,
        values: raw,
      },
    };
  }
  return {
    state: {
      status: "error",
      message: "Ese producto no tiene el talle elegido.",
      fieldErrors: { size: "Elegí un talle disponible." },
      values: raw,
    },
  };
}
