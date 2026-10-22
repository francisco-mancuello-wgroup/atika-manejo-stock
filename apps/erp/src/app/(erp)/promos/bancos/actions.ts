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
import { readLogoFields } from "../../../../lib/banks/form-data";
import { localLogoStorage } from "../../../../lib/banks/local-logo-storage";
import { deleteBank, saveBank } from "../../../../lib/banks/save";
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

/** "Guardar" on a bank: `bankId` is null when creating. Bound to the bank by the form. */
export async function saveBankAction(
  bankId: string | null,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();
  const values = formValues(formData);
  try {
    const logo = await readLogoFields(formData);
    const state = await saveBank(getDb(), bankId, values, { ...logo, storage: localLogoStorage() });
    if (state.status === "success") revalidateBanks();
    return state;
  } catch (error) {
    console.error("saveBankAction failed", error);
    return { ...FAILED, values };
  }
}

export async function deleteBankAction(bankId: string): Promise<FormState> {
  await requireSession();
  try {
    const state = await deleteBank(getDb(), bankId, localLogoStorage());
    if (state.status === "success") revalidateBanks();
    return state;
  } catch (error) {
    console.error("deleteBankAction failed", error);
    return FAILED;
  }
}

/** "Guardar" on the edit page of a promo: bound to the promo id by the page. */
export async function saveBankPromoAction(
  promoId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();
  const values = formValues(formData);
  try {
    const state = await saveBankPromo(getDb(), promoId, values, listsOf(formData));
    if (state.status === "success") revalidateBanks();
    return state;
  } catch (error) {
    console.error("saveBankPromoAction failed", error);
    return { ...FAILED, values };
  }
}

/** "Guardar" on the new promo page; goes back to the list on success. */
export async function createBankPromoAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();
  const values = formValues(formData);
  try {
    const state = await saveBankPromo(getDb(), null, values, listsOf(formData));
    if (state.status !== "success") return state;
    revalidateBanks();
  } catch (error) {
    console.error("createBankPromoAction failed", error);
    return { ...FAILED, values };
  }
  redirect("/promos/bancos");
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
