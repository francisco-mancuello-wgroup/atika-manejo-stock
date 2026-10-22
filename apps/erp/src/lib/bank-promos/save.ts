import type { FormState } from "../action-state";
import { toDbDate } from "../dates";
import type { TransactionRunner } from "../lots/save";
import { type BankPromoLists, parseBankPromo } from "./schema";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_FOUND: FormState = { status: "error", message: "No se encontró la promoción." };

export type SaveBankPromoState =
  | FormState
  | { status: "success"; message: string; promoId: string };

/**
 * Creates (`promoId` null) or edits a promo. Banks, lots and products are replaced as a whole;
 * only the list of the chosen scope is kept.
 */
export async function saveBankPromo(
  db: TransactionRunner,
  promoId: string | null,
  raw: Record<string, string>,
  lists: BankPromoLists,
): Promise<SaveBankPromoState> {
  const parsed = parseBankPromo(raw, lists);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisá los campos marcados.",
      fieldErrors: parsed.fieldErrors,
      values: raw,
    };
  }
  if (promoId !== null && !UUID.test(promoId)) return { ...NOT_FOUND, values: raw } as FormState;

  const { bankIds, lotIds, productIds, startsAt, endsAt, ...fields } = parsed.data;
  const data = {
    ...fields,
    startsAt: startsAt ? toDbDate(startsAt) : null,
    endsAt: endsAt ? toDbDate(endsAt) : null,
  };

  const outcome = await db.$transaction(async (tx) => {
    const banks = await tx.bank.count({ where: { id: { in: bankIds } } });
    if (banks !== bankIds.length) return "missing-banks" as const;

    let id: string;
    if (promoId === null) {
      id = (await tx.bankPromo.create({ data })).id;
    } else {
      const updated = await tx.bankPromo.updateMany({ where: { id: promoId }, data });
      if (updated.count === 0) return "not-found" as const;
      id = promoId;
      await tx.bankPromoBank.deleteMany({ where: { promoId: id } });
      await tx.bankPromoLot.deleteMany({ where: { promoId: id } });
      await tx.bankPromoProduct.deleteMany({ where: { promoId: id } });
    }
    await tx.bankPromoBank.createMany({ data: bankIds.map((bankId) => ({ promoId: id, bankId })) });
    if (lotIds.length > 0) {
      await tx.bankPromoLot.createMany({ data: lotIds.map((lotId) => ({ promoId: id, lotId })) });
    }
    if (productIds.length > 0) {
      await tx.bankPromoProduct.createMany({
        data: productIds.map((productId) => ({ promoId: id, productId })),
      });
    }
    return id;
  });

  if (outcome === "not-found") return { ...NOT_FOUND, values: raw } as FormState;
  if (outcome === "missing-banks") {
    return {
      status: "error",
      message: "Revisá los campos marcados.",
      fieldErrors: { bankIds: "Elegí bancos que existan." },
      values: raw,
    };
  }
  return {
    status: "success",
    message: promoId === null ? "Promoción creada." : "Promoción guardada.",
    promoId: outcome,
  };
}

export async function setBankPromoActive(
  db: TransactionRunner,
  promoId: string,
  isActive: boolean,
): Promise<FormState> {
  if (!UUID.test(promoId)) return NOT_FOUND;
  const result = await db.$transaction((tx) =>
    tx.bankPromo.updateMany({ where: { id: promoId }, data: { isActive } }),
  );
  return result.count === 0 ? NOT_FOUND : { status: "success", message: "Cambio guardado." };
}

export async function deleteBankPromo(db: TransactionRunner, promoId: string): Promise<FormState> {
  if (!UUID.test(promoId)) return NOT_FOUND;
  const result = await db.$transaction((tx) => tx.bankPromo.deleteMany({ where: { id: promoId } }));
  return result.count === 0 ? NOT_FOUND : { status: "success", message: "Promoción eliminada." };
}
