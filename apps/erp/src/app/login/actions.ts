"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { type FormState, formValues } from "../../lib/action-state";
import { clientIpFrom } from "../../lib/auth/client-ip";
import { authenticate } from "../../lib/auth/login";
import { safeNextPath } from "../../lib/auth/next-path";
import { createSession, revokeSession } from "../../lib/auth/session";
import { getDb } from "../../lib/db";

/** Public action: the only one that does not call `requireSession()`. */
export async function loginAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const email = values.email ?? "";
  const keepEmail = { email };

  let userId: string;
  try {
    const requestHeaders = await headers();
    const result = await authenticate(
      getDb(),
      { email, password: values.password ?? "" },
      clientIpFrom((name) => requestHeaders.get(name)),
    );
    if (result.status === "limited") {
      return {
        status: "error",
        message: "Demasiados intentos. Probá de nuevo en unos minutos.",
        values: keepEmail,
      };
    }
    if (result.status === "invalid") {
      return { status: "error", message: "Email o contraseña incorrectos.", values: keepEmail };
    }
    userId = result.userId;
    await createSession(userId);
  } catch (error) {
    console.error("loginAction failed", error);
    return {
      status: "error",
      message: "No se pudo ingresar. Intentá de nuevo en unos segundos.",
      values: keepEmail,
    };
  }
  redirect(safeNextPath(values.next));
}

/** Public on purpose: signing out without a (valid) session is harmless. */
export async function logoutAction(): Promise<void> {
  await revokeSession();
  redirect("/login");
}
