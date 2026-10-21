"use client";

import { Button, Input } from "@atika/ui";
import { useActionState } from "react";
import { type FormState, IDLE } from "../lib/action-state";
import type { AppSettingsView } from "../lib/queries/settings";
import { Field, FormMessage } from "./form-controls";

type Action = (previous: FormState, formData: FormData) => Promise<FormState>;

const FIELDS = [
  { name: "exchangeRate", label: "TC del día (₲ / US$)", key: "exchangeRate" },
  { name: "saleFactor", label: "Factor de venta por defecto", key: "saleFactor" },
  { name: "vatPercent", label: "IVA (%)", key: "vatPercent" },
  { name: "costPercent", label: "Costo sobre valor original (%)", key: "costPercent" },
] as const satisfies readonly { name: string; label: string; key: keyof AppSettingsView }[];

export function SettingsForms({
  settings,
  saveAction,
  applyAction,
}: {
  settings: AppSettingsView;
  saveAction: Action;
  applyAction: Action;
}) {
  const [saveState, saveFormAction, saving] = useActionState(saveAction, IDLE);
  const [applyState, applyFormAction, applying] = useActionState(applyAction, IDLE);
  const errors = saveState.status === "error" ? (saveState.fieldErrors ?? {}) : {};
  const values = saveState.status === "error" ? (saveState.values ?? {}) : {};

  return (
    <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
      <form
        action={saveFormAction}
        className="flex flex-col gap-4 border border-line bg-surface p-5"
      >
        <h2 className="font-display text-2xl text-ink">Valores por defecto</h2>
        {FIELDS.map((field) => (
          <Field
            key={field.name}
            label={field.label}
            htmlFor={field.name}
            error={errors[field.name]}
          >
            <Input
              id={field.name}
              name={field.name}
              type="number"
              step="any"
              required
              defaultValue={values[field.name] ?? settings[field.key]}
              aria-invalid={errors[field.name] ? true : undefined}
              aria-describedby={errors[field.name] ? `${field.name}-error` : undefined}
            />
          </Field>
        ))}
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando…" : "Guardar parámetros"}
        </Button>
        <FormMessage state={saveState} />
      </form>

      <form
        action={applyFormAction}
        className="flex flex-col gap-4 self-start border border-line bg-surface p-5"
      >
        <h2 className="font-display text-2xl text-ink">Aplicar a los lotes</h2>
        <p className="text-sm text-muted">
          Escribe el factor de venta y el IVA guardados en todos los lotes y recalcula todos los
          precios. Cada lote conserva su tipo de cambio, su costo y su envío. Guardá los parámetros
          antes de aplicarlos.
        </p>
        <Button type="submit" variant="secondary" disabled={applying}>
          {applying ? "Aplicando…" : "Aplicar a todos los lotes"}
        </Button>
        <FormMessage state={applyState} />
      </form>
    </div>
  );
}
