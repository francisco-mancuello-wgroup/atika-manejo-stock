"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type FormState, formValues } from "../../../../lib/action-state";
import { requireSession } from "../../../../lib/auth/session";
import {
  deleteBankPromo,
  saveBankPromo,
  setBankPromoActive,
} from "../../../../lib/bank-promos/save";
import { workspaceHref } from "../../../../lib/bank-promos/workspace";
import { readLogoFields } from "../../../../lib/banks/form-data";
import { deleteBank, saveBank } from "../../../../lib/banks/save";
import { bankLogoStorage } from "../../../../lib/banks/storage";
import { getDb } from "../../../../lib/db";

const FAILED = {
  status: "error",
  message: "No se pudo guardar. Intentá de nuevo en unos segundos.",
} as const;

/** Banks and promos show on this section; the catalog reads them from the database per request. */
function revalidateBanks() {
  revalidatePath("/promos/bancos");
}

function listsOf(formData: FormData) {
  const strings = (name: string) =>
    formData.getAll(name).filter((value): value is string => typeof value === "string");
  return {
    bankIds: strings("bankIds"),
    days: strings("days"),
    lotIds: strings("lotIds"),
    productIds: strings("productIds"),
  };
}

/**
 * "Guardar" on a bank: `bankId` is null when creating. Bound to the bank by the form. A new bank
 * is selected in the master-detail screen once created.
 */
export async function saveBankAction(
  bankId: string | null,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();
  const values = formValues(formData);
  let createdId: string | null = null;
  try {
    const logo = await readLogoFields(formData);
    const state = await saveBank(getDb(), bankId, values, { ...logo, storage: bankLogoStorage() });
    if (state.status !== "success") return state;
    revalidateBanks();
    if (bankId !== null || !("bankId" in state)) return state;
    createdId = state.bankId;
  } catch (error) {
    console.error("saveBankAction failed", error);
    return { ...FAILED, values };
  }
  redirect(workspaceHref({ tab: "bancos", id: createdId }));
}

export async function deleteBankAction(bankId: string): Promise<FormState> {
  await requireSession();
  try {
    const state = await deleteBank(getDb(), bankId, bankLogoStorage());
    if (state.status === "success") revalidateBanks();
    return state;
  } catch (error) {
    console.error("deleteBankAction failed", error);
    return FAILED;
  }
}

/**
 * "Guardar" on a promo: `promoId` is null when creating. Bound to the promo by the form. A new
 * promo is selected in the master-detail screen once created.
 */
export async function saveBankPromoAction(
  promoId: string | null,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();
  const values = formValues(formData);
  let createdId: string | null = null;
  try {
    const state = await saveBankPromo(getDb(), promoId, values, listsOf(formData));
    if (state.status !== "success") return state;
    revalidateBanks();
    if (promoId !== null || !("promoId" in state)) return state;
    createdId = state.promoId;
  } catch (error) {
    console.error("saveBankPromoAction failed", error);
    return { ...FAILED, values };
  }
  redirect(workspaceHref({ tab: "promos", id: createdId }));
}

export async function setBankPromoActiveAction(
  promoId: string,
  isActive: boolean,
): Promise<FormState> {
  await requireSession();
  try {
    const state = await setBankPromoActive(getDb(), promoId, isActive);
    if (state.status === "success") revalidateBanks();
    return state;
  } catch (error) {
    console.error("setBankPromoActiveAction failed", error);
    return FAILED;
  }
}

export async function deleteBankPromoAction(promoId: string): Promise<FormState> {
  await requireSession();
  try {
    const state = await deleteBankPromo(getDb(), promoId);
    if (state.status === "success") revalidateBanks();
    return state;
  } catch (error) {
    console.error("deleteBankPromoAction failed", error);
    return FAILED;
  }
}
