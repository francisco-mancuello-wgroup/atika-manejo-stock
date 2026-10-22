"use client";

import { Button, Input } from "@atika/ui";
import { useActionState } from "react";
import { type FormState, IDLE } from "../lib/action-state";
import type { PaymentDetailsView } from "../lib/queries/payment";
import { Field, FormMessage } from "./form-controls";

type Action = (previous: FormState, formData: FormData) => Promise<FormState>;

const FIELDS = [
  { name: "holderName", label: "Razón social", numeric: false },
  { name: "bank", label: "Banco", numeric: false },
  { name: "accountGs", label: "Cuenta en guaraníes", numeric: true },
  { name: "accountUsd", label: "Cuenta en dólares", numeric: true },
  { name: "ruc", label: "RUC", numeric: true },
] as const;

/** The bank details shown on the store's /datos-bancarios page. */
export function PaymentDetailsForm({
  details,
  action,
}: {
  details: PaymentDetailsView | null;
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const values = state.status === "error" ? (state.values ?? {}) : {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {FIELDS.map((field) => (
        <Field key={field.name} label={field.label} htmlFor={field.name} error={errors[field.name]}>
          <Input
            id={field.name}
            name={field.name}
            inputMode={field.numeric ? "numeric" : undefined}
            defaultValue={values[field.name] ?? details?.[field.name] ?? ""}
            aria-invalid={errors[field.name] ? true : undefined}
            aria-describedby={errors[field.name] ? `${field.name}-error` : undefined}
          />
        </Field>
      ))}
      <FormMessage state={state} />
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Guardando…" : "Guardar datos bancarios"}
      </Button>
    </form>
  );
}
