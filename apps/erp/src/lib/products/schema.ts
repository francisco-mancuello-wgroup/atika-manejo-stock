import { isCatalogCategory } from "@atika/db/categories";
import { z } from "zod";
import { fieldErrors as firstErrors, numberField, roundTo } from "../form";
import { SIZE_ORDER } from "../sizes";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Blank or missing text becomes null, anything else is trimmed. */
function blankToNull(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return value;
  const text = value.trim();
  return text === "" ? null : text;
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

const count = (label: string) =>
  numberField(label).pipe(
    z
      .number()
      .int({ error: `${label} debe ser un número entero.` })
      .min(0, { error: `${label} no puede ser negativo.` })
      .max(100_000, { error: `${label} es demasiado grande.` }),
  );

const sizeRow = z
  .object({
    size: z.enum(SIZE_ORDER as [string, ...string[]], { error: "Elegí un talle de la lista." }),
    unitsBought: count("Las unidades"),
    stock: count("El stock"),
  })
  .refine((row) => row.stock <= row.unitsBought, {
    error: "El stock no puede superar las unidades compradas.",
    path: ["stock"],
  });

const productFields = {
  code: optionalText("El código", 40),
  name: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z
      .string({ error: "Ingresá el nombre." })
      .min(1, { error: "Ingresá el nombre." })
      .max(120, { error: "El nombre no puede superar 120 caracteres." }),
  ),
  brand: optionalText("La marca", 60),
  color: optionalText("El color", 60),
  category: z.preprocess(
    blankToNull,
    z.string().refine(isCatalogCategory, { error: "Esa categoría no existe." }).nullable(),
  ),
  description: optionalText("La descripción", 2000),
  originalValueUsd: numberField("El valor original")
    .pipe(
      z
        .number()
        .positive({ error: "El valor original debe ser mayor a 0." })
        .max(1_000_000, { error: "El valor original no puede superar US$ 1.000.000." }),
    )
    .transform((value) => roundTo(value, 2)),
  sizes: z
    .array(sizeRow)
    .min(1, { error: "Agregá al menos un talle." })
    .superRefine((rows, ctx) => {
      const seen = new Set<string>();
      rows.forEach((row, index) => {
        if (seen.has(row.size)) {
          ctx.addIssue({
            code: "custom",
            message: "Este talle está repetido.",
            path: [index, "size"],
          });
        }
        seen.add(row.size);
      });
    }),
};

export const productSchema = z.object(productFields);
export const newProductSchema = z.object({
  lotId: z.string({ error: "Elegí un lote." }).regex(UUID, { error: "Elegí un lote." }),
  ...productFields,
});

export type ProductInput = z.output<typeof productSchema>;
export type NewProductInput = z.output<typeof newProductSchema>;

const SIZE_KEY = /^sizes\.(\d+)\.(size|unitsBought|stock)$/;

/** Rebuilds the sizes array from the flat `sizes.<n>.<field>` form keys, in row order. */
function structure(raw: Record<string, string>): Record<string, unknown> {
  const rows = new Map<number, Record<string, string>>();
  for (const [key, value] of Object.entries(raw)) {
    const match = SIZE_KEY.exec(key);
    if (!match) continue;
    const index = Number(match[1]);
    rows.set(index, { ...rows.get(index), [match[2] as string]: value });
  }
  const sizes = [...rows.entries()].sort(([a], [b]) => a - b).map(([, row]) => row);
  return { ...raw, sizes };
}

/** Errors keyed by field; size rows use `sizes.<row>.<field>`, the list itself uses `sizes`. */
function errorsByField(issues: readonly z.core.$ZodIssue[]): Record<string, string> {
  const rowIssues = issues.filter((issue) => issue.path[0] === "sizes" && issue.path.length > 1);
  const errors = firstErrors(issues.filter((issue) => !rowIssues.includes(issue)));
  for (const issue of rowIssues) {
    errors[issue.path.join(".")] ??= issue.message;
  }
  return errors;
}

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; fieldErrors: Record<string, string> };

export function parseProductForm(raw: Record<string, string>): ParseResult<ProductInput> {
  const result = productSchema.safeParse(structure(raw));
  if (result.success) return { success: true, data: result.data };
  return { success: false, fieldErrors: errorsByField(result.error.issues) };
}

export function parseNewProductForm(raw: Record<string, string>): ParseResult<NewProductInput> {
  const result = newProductSchema.safeParse(structure(raw));
  if (result.success) return { success: true, data: result.data };
  return { success: false, fieldErrors: errorsByField(result.error.issues) };
}
