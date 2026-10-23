import type { FormState } from "../action-state";
import type { TransactionRunner } from "../lots/save";
import { parseCatalogSettings, parseCategory } from "./schema";

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
