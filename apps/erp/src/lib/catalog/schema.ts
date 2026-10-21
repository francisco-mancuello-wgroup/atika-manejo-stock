import type { Catalog } from "@atika/db";
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

/** The three lookbooks, in display order (values are the Prisma `Catalog` enum). */
export const CATALOG_OPTIONS = [
  { value: "casa_icona", label: "Casa Icona" },
  { value: "milonga", label: "Milonga" },
  { value: "sordo", label: "Sordo" },
] as const satisfies readonly { value: Catalog; label: string }[];

const CATALOG_VALUES = CATALOG_OPTIONS.map((option) => option.value) as [Catalog, ...Catalog[]];

/** Blank or missing text becomes null, anything else is trimmed. */
function blankToNull(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return value;
  const text = value.trim();
  return text === "" ? null : text;
}

/** Like `blankToNull`, then a number (a decimal comma is accepted). */
function blankToNumber(value: unknown): unknown {
  const text = blankToNull(value);
  return typeof text === "string" ? Number(text.replace(",", ".")) : text;
}

function optionalText(label: string, max: number) {
  return z.preprocess(
    blankToNull,
    z
      .string()
      .max(max, { error: `${label} no puede superar ${max} caracteres.` })
      .nullable(),
  );
}

/** One product's lookbook placement; blank fields are stored as null. */
export const lookbookSchema = z.object({
  catalog: z.preprocess(
    blankToNull,
    z.enum(CATALOG_VALUES, { error: "Elegí un catálogo de la lista." }).nullable(),
  ),
  catalogOrder: z.preprocess(
    blankToNumber,
    z
      .number({ error: "La página debe ser un número." })
      .int({ error: "La página debe ser un número entero." })
      .min(1, { error: "La página debe ser 1 o más." })
      .max(9999, { error: "La página no puede superar 9999." })
      .nullable(),
  ),
  catalogSection: optionalText("La sección", 60),
  catalogName: optionalText("El nombre", 120),
});

export type LookbookInput = z.output<typeof lookbookSchema>;

export function parseLookbook(
  raw: Record<string, string>,
):
  | { success: true; data: LookbookInput }
  | { success: false; fieldErrors: Record<string, string> } {
  const result = lookbookSchema.safeParse(raw);
  if (result.success) return { success: true, data: result.data };
  return { success: false, fieldErrors: fieldErrors(result.error.issues) };
}
