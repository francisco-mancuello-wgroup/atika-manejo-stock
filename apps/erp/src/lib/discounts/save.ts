import type { FormState } from "../action-state";
import { toDbDate } from "../dates";
import type { TransactionRunner } from "../lots/save";
import { parseDiscount } from "./schema";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_FOUND: FormState = { status: "error", message: "No se encontró el descuento." };

export type SaveDiscountState =
  | FormState
  | { status: "success"; message: string; discountId: string };

/** Creates (`discountId` null) or edits a discount; the product list is replaced as a whole. */
export async function saveDiscount(
  db: TransactionRunner,
  discountId: string | null,
  raw: Record<string, string>,
  productIds: readonly string[],
): Promise<SaveDiscountState> {
  const parsed = parseDiscount(raw, productIds);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisá los campos marcados.",
      fieldErrors: parsed.fieldErrors,
      values: raw,
    };
  }
  if (discountId !== null && !UUID.test(discountId))
    return { ...NOT_FOUND, values: raw } as FormState;

  const { productIds: ids, startsAt, endsAt, ...fields } = parsed.data;
  const data = {
    ...fields,
    startsAt: startsAt ? toDbDate(startsAt) : null,
    endsAt: endsAt ? toDbDate(endsAt) : null,
  };

  const savedId = await db.$transaction(async (tx) => {
    let id: string;
    if (discountId === null) {
      id = (await tx.discount.create({ data })).id;
    } else {
      const updated = await tx.discount.updateMany({ where: { id: discountId }, data });
      if (updated.count === 0) return null;
      id = discountId;
      await tx.discountProduct.deleteMany({ where: { discountId: id } });
    }
    if (ids.length > 0) {
      await tx.discountProduct.createMany({
        data: ids.map((productId) => ({ discountId: id, productId })),
        skipDuplicates: true,
      });
    }
    return id;
  });
  if (savedId === null) return { ...NOT_FOUND, values: raw } as FormState;
  return {
    status: "success",
    message: discountId === null ? "Descuento creado." : "Descuento guardado.",
    discountId: savedId,
  };
}

export async function setDiscountActive(
  db: TransactionRunner,
  discountId: string,
  isActive: boolean,
): Promise<FormState> {
  if (!UUID.test(discountId)) return NOT_FOUND;
  const result = await db.$transaction((tx) =>
    tx.discount.updateMany({ where: { id: discountId }, data: { isActive } }),
  );
  return result.count === 0 ? NOT_FOUND : { status: "success", message: "Cambio guardado." };
}

export async function deleteDiscount(
  db: TransactionRunner,
  discountId: string,
): Promise<FormState> {
  if (!UUID.test(discountId)) return NOT_FOUND;
  const result = await db.$transaction((tx) =>
    tx.discount.deleteMany({ where: { id: discountId } }),
  );
  return result.count === 0 ? NOT_FOUND : { status: "success", message: "Descuento eliminado." };
}
