"use server";

import { revalidatePath } from "next/cache";
import { type FormState, formValues } from "../../../lib/action-state";
import { requireSession } from "../../../lib/auth/session";
import { getDb } from "../../../lib/db";
import { saveAndApplySettings } from "../../../lib/settings/save";

/** The exchange rate shows in the sidebar of every page, so the whole layout is revalidated. */
function revalidateEverything() {
  revalidatePath("/", "layout");
}

export async function saveSettingsAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();
  const values = formValues(formData);
  const lotIds = formData.getAll("lotIds").filter((id) => typeof id === "string");
  try {
    const state = await saveAndApplySettings(getDb(), values, lotIds);
    if (state.status === "success") revalidateEverything();
    return state;
  } catch (error) {
    console.error("saveSettingsAction failed", error);
    return {
      status: "error",
      message: "No se pudo guardar. Intentá de nuevo en unos segundos.",
      values,
    };
  }
}
