import type { FormState } from "../action-state";
import { formatGs } from "../format";
import { recalculateLot } from "../lots/recalculate";
import type { TransactionRunner } from "../lots/save";
import { parseCatalogSettings, parseCategory, parseLookbook } from "./schema";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_FOUND_MESSAGE = "No se encontró el producto.";
const NOT_FOUND: FormState = { status: "error", message: NOT_FOUND_MESSAGE };

export async function saveCatalogSettings(
  db: TransactionRunner,
  raw: Record<string, string>,
): Promise<FormState> {
  const parsed = parseCatalogSettings(raw);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisá los campos marcados.",
      fieldErrors: parsed.fieldErrors,
      values: raw,
    };
  }
  await db.$transaction((tx) =>
    tx.catalogSettings.upsert({
      where: { id: 1 },
      create: { id: 1, ...parsed.data },
      update: parsed.data,
    }),
  );
  return { status: "success", message: "Configuración guardada. Ya se ve en el catálogo." };
}

async function updateProduct(
  db: TransactionRunner,
  productId: string,
  data: { isPublished: boolean } | { category: string | null },
): Promise<FormState> {
  if (!UUID.test(productId)) return NOT_FOUND;
  const result = await db.$transaction((tx) =>
    tx.product.updateMany({ where: { id: productId }, data }),
  );
  return result.count === 0 ? NOT_FOUND : { status: "success", message: "Cambio guardado." };
}

export function setProductVisibility(
  db: TransactionRunner,
  productId: string,
  isPublished: boolean,
): Promise<FormState> {
  return updateProduct(db, productId, { isPublished });
}

export async function setProductCategory(
  db: TransactionRunner,
  productId: string,
  category: string,
): Promise<FormState> {
  const parsed = parseCategory(category);
  if (!parsed.success) return { status: "error", message: "Esa categoría no existe." };
  return updateProduct(db, productId, { category: parsed.data });
}

/** Publishes every hidden product that has at least one unit in stock. */
export async function publishAllInStock(db: TransactionRunner): Promise<FormState> {
  const result = await db.$transaction((tx) =>
    tx.product.updateMany({
      where: { isPublished: false, variants: { some: { stock: { gt: 0 } } } },
      data: { isPublished: true },
    }),
  );
  const message =
    result.count === 0
      ? "No hay productos con stock para publicar."
      : `Se publicaron ${result.count} ${result.count === 1 ? "producto" : "productos"}.`;
  return { status: "success", message };
}

/** Shows or hides every given product (e.g. the current filtered list), with or without stock. */
export async function setProductsVisibility(
  db: TransactionRunner,
  productIds: readonly string[],
  isPublished: boolean,
): Promise<FormState> {
  const ids = productIds.filter((id) => UUID.test(id));
  if (ids.length === 0) return { status: "error", message: "No hay productos para actualizar." };
  const result = await db.$transaction((tx) =>
    tx.product.updateMany({ where: { id: { in: ids } }, data: { isPublished } }),
  );
  const noun = result.count === 1 ? "producto" : "productos";
  const message = isPublished
    ? `Se hicieron visibles ${result.count} ${noun}.`
    : `Se ocultaron ${result.count} ${noun}.`;
  return { status: "success", message };
}

/**
 * Saves one product's lookbook placement and the owner's US$ sale price. When the sale price
 * changes (set or cleared), the product's lot is repriced in the same transaction, so `priceGs`
 * follows at once and shipping proration stays consistent with the lot screen.
 */
export async function saveProductLookbook(
  db: TransactionRunner,
  raw: Record<string, string>,
): Promise<FormState> {
  const productId = raw.productId ?? "";
  if (!UUID.test(productId)) return { status: "error", message: NOT_FOUND_MESSAGE, values: raw };
  const parsed = parseLookbook(raw);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisá los campos marcados.",
      fieldErrors: parsed.fieldErrors,
      values: raw,
    };
  }
  const data = parsed.data;

  const outcome = await db.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { salePriceUsd: true, lot: true },
    });
    if (!product) return null;
    await tx.product.update({ where: { id: productId }, data });
    const priceChanged = (product.salePriceUsd?.toNumber() ?? null) !== data.salePriceUsd;
    if (priceChanged) {
      const { lot } = product;
      await recalculateLot(tx, lot.id, {
        exchangeRate: lot.exchangeRate.toNumber(),
        saleFactor: lot.saleFactor.toNumber(),
        vatRate: lot.vatRate.toNumber(),
        costRate: lot.costRate.toNumber(),
        totalShippingUsd: lot.totalShippingUsd.toNumber(),
      });
    }
    const { priceGs } = await tx.product.findUniqueOrThrow({
      where: { id: productId },
      select: { priceGs: true },
    });
    return { priceChanged, priceGs };
  });
  if (!outcome) return { status: "error", message: NOT_FOUND_MESSAGE, values: raw };
  return {
    status: "success",
    message: outcome.priceChanged
      ? `Guardado. Nuevo precio: ${formatGs(outcome.priceGs)}.`
      : "Guardado.",
  };
}
