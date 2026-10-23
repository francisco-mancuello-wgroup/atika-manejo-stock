import { isCatalogCategory } from "@atika/db/categories";
import { z } from "zod";
import { fieldErrors } from "../form";

const checkbox = z.preprocess((value) => value === "on" || value === "true", z.boolean());

const digitCount = (value: string) => value.replace(/\D/g, "").length;

/** Checkboxes are absent from the form data when unchecked. */
export const catalogSettingsSchema = z.object({
  whatsappNumber: z
    .string({ error: "Ingresá el número de WhatsApp." })
    .trim()
    .regex(/^[+\d\s()-]+$/, { error: "Usá solo dígitos, espacios, + y guiones." })
    .refine((value) => digitCount(value) >= 8 && digitCount(value) <= 15, {
      error: "El número debe tener entre 8 y 15 dígitos.",
    }),
  messageTemplate: z
    .string({ error: "Escribí el mensaje." })
    .trim()
    .min(1, { error: "Escribí el mensaje." })
    .max(500, { error: "El mensaje no puede superar 500 caracteres." })
    .refine((value) => value.includes("{producto}"), {
      error: "El mensaje debe incluir {producto}.",
    }),
  heroText: z
    .string({ error: "Escribí el texto de portada." })
    .trim()
    .min(1, { error: "Escribí el texto de portada." })
    .max(200, { error: "El texto no puede superar 200 caracteres." }),
  showPrices: checkbox,
  showSoldOutSizes: checkbox,
  hideOutOfStock: checkbox,
});

export type CatalogSettingsInput = z.output<typeof catalogSettingsSchema>;

export type ParseCatalogSettingsResult =
  | { success: true; data: CatalogSettingsInput }
  | { success: false; fieldErrors: Record<string, string> };

export function parseCatalogSettings(raw: Record<string, string>): ParseCatalogSettingsResult {
  const result = catalogSettingsSchema.safeParse(raw);
  if (result.success) return { success: true, data: result.data };
  return { success: false, fieldErrors: fieldErrors(result.error.issues) };
}

/** A known category slug, or blank for "no category" (stored as null). */
export function parseCategory(
  raw: string,
): { success: true; data: string | null } | { success: false } {
  if (raw === "") return { success: true, data: null };
  return isCatalogCategory(raw) ? { success: true, data: raw } : { success: false };
}
