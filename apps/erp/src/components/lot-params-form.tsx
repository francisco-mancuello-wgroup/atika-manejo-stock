"use client";

import { Button, Input } from "@atika/ui";
import { useActionState } from "react";
import { type FormState, IDLE } from "../lib/action-state";
import type { LotParams } from "../lib/view-models";
import { Field, FormMessage } from "./form-controls";

type Action = (previous: FormState, formData: FormData) => Promise<FormState>;

const FIELDS = [
  { name: "exchangeRate", label: "Tipo de cambio (₲ / US$)", key: "exchangeRate", step: "any" },
  { name: "saleFactor", label: "Factor de venta", key: "saleFactor", step: "any" },
  { name: "vatPercent", label: "IVA (%)", key: "vatPercent", step: "any" },
  {
    name: "costPercent",
    label: "Costo sobre valor original (%)",
    key: "costPercent",
    step: "any",
  },
  { name: "totalShippingUsd", label: "Envío total (US$)", key: "totalShippingUsd", step: "any" },
] as const satisfies readonly { name: string; label: string; key: keyof LotParams; step: string }[];

export function LotParamsForm({ params, action }: { params: LotParams; action: Action }) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const values = state.status === "error" ? (state.values ?? {}) : {};

  return (
    <form action={formAction} className="flex flex-col gap-4 border border-line bg-surface p-5">
      <h2 className="font-display text-2xl text-ink">Parámetros del lote</h2>
      {FIELDS.map((field) => (
        <Field key={field.name} label={field.label} htmlFor={field.name} error={errors[field.name]}>
          <Input
            id={field.name}
            name={field.name}
            type="number"
            step={field.step}
            required
            defaultValue={values[field.name] ?? params[field.key]}
            aria-invalid={errors[field.name] ? true : undefined}
            aria-describedby={errors[field.name] ? `${field.name}-error` : undefined}
          />
        </Field>
      ))}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar y recalcular"}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
