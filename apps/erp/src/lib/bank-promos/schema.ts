import { z } from "zod";
import { checkbox, fieldErrors, numberField, optionalDate } from "../form";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CAP_GS = 2_000_000_000;

export const BANK_PROMO_KINDS = ["installments", "refund", "discount"] as const;
export const BANK_PROMO_SCOPES = ["all", "lots", "products"] as const;

/** Guaraníes are typed with thousands dots ("200.000"): drop them and spaces. Blank = no cap. */
const optionalCap = z.preprocess((value) => {
  if (typeof value !== "string" || value.trim() === "") return null;
  return Number(value.replace(/[.\s]/g, ""));
}, z
  .number({ error: "El tope debe ser un número entero." })
  .int({ error: "El tope debe ser un número entero." })
  .min(1, { error: "El tope debe ser mayor a 0." })
  .max(MAX_CAP_GS, { error: "El tope es demasiado grande." })
  .nullable());

const optionalTerms = z.preprocess(
  (value) => (typeof value === "string" && value.trim() !== "" ? value.trim() : null),
  z
    .string()
    .max(2000, { error: "Las bases y condiciones no pueden superar 2000 caracteres." })
    .nullable(),
);

export const bankPromoSchema = z
  .object({
    kind: z.enum(BANK_PROMO_KINDS, { error: "Elegí el tipo de promoción." }),
    value: numberField("El valor").pipe(
      z.number().int({ error: "El valor debe ser un número entero." }),
    ),
    capGs: optionalCap,
    startsAt: optionalDate("Elegí una fecha válida."),
    endsAt: optionalDate("Elegí una fecha válida."),
    terms: optionalTerms,
    isActive: checkbox,
    scope: z.enum(BANK_PROMO_SCOPES, { error: "Elegí a qué productos se aplica." }),
  })
  .superRefine((promo, ctx) => {
    if (promo.kind === "installments" && (promo.value < 2 || promo.value > 48)) {
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: "Las cuotas deben estar entre 2 y 48.",
      });
    }
    if (promo.kind !== "installments" && (promo.value < 1 || promo.value > 100)) {
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: "El porcentaje debe estar entre 1 y 100.",
      });
    }
    if (promo.startsAt && promo.endsAt && promo.endsAt < promo.startsAt) {
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "La fecha de fin no puede ser anterior a la de inicio.",
      });
    }
  });

/** The repeated form entries (checkbox groups and pickers), read from the FormData by the action. */
export interface BankPromoLists {
  bankIds: readonly string[];
  days: readonly string[];
  lotIds: readonly string[];
  productIds: readonly string[];
}

export type BankPromoInput = z.output<typeof bankPromoSchema> & {
  bankIds: string[];
  /** ISO weekdays, sorted; empty = every day. */
  days: number[];
  lotIds: string[];
  productIds: string[];
};

export type ParseBankPromoResult =
  | { success: true; data: BankPromoInput }
  | { success: false; fieldErrors: Record<string, string> };

const uniqueIds = (ids: readonly string[]) => [...new Set(ids.filter((id) => UUID.test(id)))];

function parseDays(values: readonly string[]): number[] {
  const days = new Set<number>();
  for (const value of values) {
    const day = Number(value);
    if (Number.isInteger(day) && day >= 1 && day <= 7) days.add(day);
  }
  // Ticking all seven is the same as ticking none: every day.
  return days.size === 7 ? [] : [...days].sort((a, b) => a - b);
}

export function parseBankPromo(
  raw: Record<string, string>,
  lists: BankPromoLists,
): ParseBankPromoResult {
  const result = bankPromoSchema.safeParse(raw);
  const errors = result.success ? {} : fieldErrors(result.error.issues);

  const bankIds = uniqueIds(lists.bankIds);
  if (bankIds.length === 0) errors.bankIds = "Elegí al menos un banco.";

  const scope = result.success ? result.data.scope : null;
  const lotIds = scope === "lots" ? uniqueIds(lists.lotIds) : [];
  const productIds = scope === "products" ? uniqueIds(lists.productIds) : [];
  if (scope === "lots" && lotIds.length === 0) errors.lotIds = "Elegí al menos un lote.";
  if (scope === "products" && productIds.length === 0) {
    errors.productIds = "Elegí al menos un producto.";
  }

  if (!result.success || Object.keys(errors).length > 0) {
    return { success: false, fieldErrors: errors };
  }
  return {
    success: true,
    data: { ...result.data, bankIds, days: parseDays(lists.days), lotIds, productIds },
  };
}
