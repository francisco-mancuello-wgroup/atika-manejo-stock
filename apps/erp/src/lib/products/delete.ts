import type { Prisma } from "@atika/db";
import type { FormState } from "../action-state";
import { recalculateLot } from "../lots/recalculate";
import type { TransactionRunner } from "../lots/save";
import { isUploadedPhoto, type PhotoStorage } from "./photo-storage";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type DeletionBlock = "sales" | "orders";

export const DELETION_BLOCK_MESSAGE: Record<DeletionBlock, string> = {
  sales: "No se puede eliminar: el producto tiene ventas.",
  orders: "No se puede eliminar: el producto tiene ventas o pedidos.",
};

export type DeleteProductResult =
  | Extract<FormState, { status: "error" }>
  | { status: "success"; name: string };

/** The block for a product's counts: sales and sold group units first, then web order lines. */
export function blockFromCounts(counts: {
  sales: number;
  sold: number;
  orders: number;
}): DeletionBlock | null {
  if (counts.sales > 0 || counts.sold > 0) return "sales";
  return counts.orders > 0 ? "orders" : null;
}

/**
 * Why a product can't be deleted, or null when it can. Sales and sold group units are history
 * ("sales"); web order lines keep a variant reference too ("orders").
 */
export async function deletionBlock(
  tx: Pick<Prisma.TransactionClient, "sale" | "groupAllocation" | "orderItem">,
  productId: string,
): Promise<DeletionBlock | null> {
  const variants = { product: { id: productId } };
  const [sales, sold, ordered] = await Promise.all([
    tx.sale.count({ where: { variant: variants } }),
    tx.groupAllocation.count({ where: { variant: variants, sold: { gt: 0 } } }),
    tx.orderItem.count({ where: { variant: variants } }),
  ]);
  return blockFromCounts({ sales, sold, orders: ordered });
}

const fail = (message: string) => ({ status: "error", message }) as const;

/**
 * Deletes a product that never sold, in one transaction: its unsold group allocations first (the
 * only restrict relation that can remain), then the product, which cascades to its variants, photos
 * and discount / bank promo links. The lot is repriced because shipping is prorated over its units.
 * Uploaded photo files go afterwards; a storage failure is logged, never fatal.
 */
export async function deleteProduct(
  db: TransactionRunner,
  productId: string,
  storage?: PhotoStorage,
): Promise<DeleteProductResult> {
  if (!UUID.test(productId)) return fail("No se encontró el producto.");

  const outcome = await db.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { name: true, lotId: true, images: { select: { url: true } } },
    });
    if (!product) return fail("No se encontró el producto.");
    const block = await deletionBlock(tx, productId);
    if (block) return fail(DELETION_BLOCK_MESSAGE[block]);

    await tx.groupAllocation.deleteMany({ where: { variant: { productId } } });
    await tx.product.delete({ where: { id: productId } });

    const lot = await tx.lot.findUniqueOrThrow({ where: { id: product.lotId } });
    await recalculateLot(tx, product.lotId, {
      exchangeRate: lot.exchangeRate.toNumber(),
      saleFactor: lot.saleFactor.toNumber(),
      vatRate: lot.vatRate.toNumber(),
      costRate: lot.costRate.toNumber(),
      totalShippingUsd: lot.totalShippingUsd.toNumber(),
    });
    return {
      status: "success",
      name: product.name,
      uploaded: product.images.map((image) => image.url).filter(isUploadedPhoto),
    } as const;
  });

  if (outcome.status !== "success") return outcome;
  const results = await Promise.allSettled(
    outcome.uploaded.map((url) => storage?.deleteProductPhoto(url)),
  );
  for (const result of results) {
    if (result.status === "rejected")
      console.error("deleteProduct: photo cleanup failed", result.reason);
  }
  return { status: "success", name: outcome.name };
}
