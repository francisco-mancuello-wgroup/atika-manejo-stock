import { z } from "zod";
import { fieldErrors } from "../form";

/** Blank means "no limit"; anything else must be a date the browser can parse. */
const optionalDate = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.coerce.date({ error: "Ingresá una fecha válida." }).optional(),
);

export const groupSchema = z
  .object({
    name: z
      .string({ error: "Escribí el nombre del grupo." })
      .trim()
      .min(1, { error: "Escribí el nombre del grupo." })
      .max(80, { error: "El nombre no puede superar 80 caracteres." }),
    startsAt: optionalDate,
    endsAt: optionalDate,
  })
  .refine(({ startsAt, endsAt }) => !startsAt || !endsAt || endsAt >= startsAt, {
    path: ["endsAt"],
    error: "El fin no puede ser anterior al inicio.",
  });

export interface GroupInput {
  name: string;
  startsAt: Date | null;
  endsAt: Date | null;
}

export type ParseGroupResult =
  | { success: true; data: GroupInput }
  | { success: false; fieldErrors: Record<string, string> };

export function parseGroup(raw: Record<string, string>): ParseGroupResult {
  const result = groupSchema.safeParse(raw);
  if (!result.success) return { success: false, fieldErrors: fieldErrors(result.error.issues) };
  const { name, startsAt, endsAt } = result.data;
  return { success: true, data: { name, startsAt: startsAt ?? null, endsAt: endsAt ?? null } };
}
