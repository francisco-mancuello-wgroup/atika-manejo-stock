"use server";

import { revalidatePath } from "next/cache";
import { type FormState, formValues } from "../../../../lib/action-state";
import { requireSession } from "../../../../lib/auth/session";
import { readLogoFields } from "../../../../lib/banks/form-data";
import { localLogoStorage } from "../../../../lib/banks/local-logo-storage";
import { deleteBank, saveBank } from "../../../../lib/banks/save";
import { getDb } from "../../../../lib/db";

const FAILED = {
  status: "error",
  message: "No se pudo guardar. Intentá de nuevo en unos segundos.",
} as const;

/** Banks show in the promos list and the form here, and in the product sheet of the catalog. */
function revalidateBanks() {
  revalidatePath("/promos/bancos");
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
