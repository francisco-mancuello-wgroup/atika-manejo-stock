"use client";

import { Button, Input } from "@atika/ui";
import { useActionState } from "react";
import { type FormState, IDLE } from "../lib/action-state";
import { Field, FormMessage } from "./form-controls";

type Action = (previous: FormState, formData: FormData) => Promise<FormState>;

export function LotShippingForm({
  totalShippingUsd,
  action,
}: {
  totalShippingUsd: number;
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  const error = state.status === "error" ? state.fieldErrors?.totalShippingUsd : undefined;
  const value = state.status === "error" ? state.values?.totalShippingUsd : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4 border border-line bg-surface p-5">
      <h2 className="font-display text-2xl text-ink">Envío</h2>
      <Field label="Envío total (US$)" htmlFor="totalShippingUsd" error={error}>
        <Input
          id="totalShippingUsd"
          name="totalShippingUsd"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={value ?? totalShippingUsd}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "totalShippingUsd-error" : undefined}
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar envío"}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
