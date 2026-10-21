"use server";

import { cookies } from "next/headers";
import { changePassword } from "../../../lib/account/change-password";
import { type FormState, formValues } from "../../../lib/action-state";
import { requireSession } from "../../../lib/auth/session";
import { hashToken, SESSION_COOKIE } from "../../../lib/auth/token";
import { getDb } from "../../../lib/db";

export async function changePasswordAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  const values = formValues(formData);
  try {
    // requireSession() proved the cookie exists and maps to a live session.
    const token = (await cookies()).get(SESSION_COOKIE)?.value ?? "";
    return await changePassword(
      getDb(),
      { userId: session.userId, currentSessionTokenHash: hashToken(token) },
      {
        currentPassword: values.currentPassword ?? "",
        newPassword: values.newPassword ?? "",
        confirmPassword: values.confirmPassword ?? "",
      },
    );
  } catch (error) {
    console.error("changePasswordAction failed", error instanceof Error ? error.name : "unknown");
    return {
      status: "error",
      message: "No se pudo cambiar la contraseña. Intentá de nuevo en unos segundos.",
    };
  }
}
