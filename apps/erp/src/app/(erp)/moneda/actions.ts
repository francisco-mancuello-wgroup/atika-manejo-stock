"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { requireSession } from "../../../lib/auth/session";
import { CURRENCY_COOKIE, parseCurrency } from "../../../lib/currency";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Remembers the display currency; the ERP re-renders every amount with it. */
export async function setCurrencyAction(formData: FormData): Promise<void> {
  await requireSession();
  const currency = parseCurrency(String(formData.get("currency") ?? ""));
  (await cookies()).set(CURRENCY_COOKIE, currency, {
    path: "/",
    sameSite: "lax",
    maxAge: ONE_YEAR_SECONDS,
  });
  revalidatePath("/", "layout");
}
