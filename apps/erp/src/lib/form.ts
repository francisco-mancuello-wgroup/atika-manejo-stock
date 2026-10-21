import { z } from "zod";

/** Form fields arrive as strings: blank means missing, and a decimal comma is accepted. */
function toNumber(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const text = value.trim();
  if (text === "") return undefined;
  return Number(text.replace(",", "."));
}

export function numberField(label: string) {
  return z.preprocess(toNumber, z.number({ error: `${label} debe ser un número.` }));
}

/** First message per field, keyed by the top-level field name. */
export function fieldErrors(issues: readonly z.core.$ZodIssue[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** A percentage between 0 and 100 typed in a form (the database stores fractions). */
export function percentField(label: string) {
  return numberField(label)
    .pipe(z.number().min(0, { error: `${label} no puede ser negativo.` }))
    .pipe(z.number().max(100, { error: `${label} no puede superar 100.` }));
}
