"use client";

import { Button, Input } from "@atika/ui";
import { useActionState, useState } from "react";
import { type FormState, IDLE } from "../lib/action-state";
import { countOf } from "../lib/format";
import type { SettingsLot } from "../lib/queries/lots";
import type { AppSettingsView } from "../lib/queries/settings";
import type { SettingsScope } from "../lib/settings/schema";
import { Field, FormMessage } from "./form-controls";

type Action = (previous: FormState, formData: FormData) => Promise<FormState>;

const FIELDS = [
  { name: "exchangeRate", label: "TC del día (₲ / US$)", key: "exchangeRate" },
  { name: "saleFactor", label: "Factor de venta por defecto", key: "saleFactor" },
  { name: "vatPercent", label: "IVA (%)", key: "vatPercent" },
  { name: "costPercent", label: "Costo sobre valor original (%)", key: "costPercent" },
] as const satisfies readonly { name: string; label: string; key: keyof AppSettingsView }[];

const SCOPE_OPTIONS: { value: SettingsScope; label: string }[] = [
  { value: "new", label: "Solo lotes nuevos" },
  { value: "selected", label: "Lotes seleccionados" },
  { value: "all", label: "Todos los lotes" },
];

const FORMULA_STEPS = [
  { label: "Envío por unidad", formula: "Envío total del lote ÷ unidades compradas" },
  { label: "Costo unitario", formula: "Valor original × % costo + envío por unidad" },
  {
    label: "Precio de venta",
    formula: "Costo unitario × factor × (1 + IVA) × TC",
    note: "Redondeado a 1.000 ₲",
  },
];

export function SettingsForm({
  settings,
  lots,
  action,
}: {
  settings: AppSettingsView;
  lots: SettingsLot[];
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  const [scope, setScope] = useState<SettingsScope>("new");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const values = state.status === "error" ? (state.values ?? {}) : {};

  const targets =
    scope === "all"
      ? lots
      : scope === "selected"
        ? lots.filter((l) => selectedIds.includes(l.id))
        : [];
  const products = targets.reduce((sum, lot) => sum + lot.productCount, 0);

  const toggle = (id: string) =>
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((other) => other !== id) : [...current, id],
    );

  return (
    <div className="grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <form action={formAction} className="flex flex-col gap-4 border border-line bg-surface p-5">
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

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-medium text-ink">Aplicar a</legend>
          {SCOPE_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm text-ink">
              <input
                type="radio"
                name="scope"
                value={option.value}
                checked={scope === option.value}
                onChange={() => setScope(option.value)}
              />
              {option.label}
            </label>
          ))}
          {errors.scope ? <p className="text-xs text-warn">{errors.scope}</p> : null}
        </fieldset>

        {scope === "selected" ? (
          <fieldset
            className="flex max-h-64 flex-col gap-2 overflow-y-auto border border-line p-3"
            aria-invalid={errors.lotIds ? true : undefined}
            aria-describedby={errors.lotIds ? "lotIds-error" : undefined}
          >
            <legend className="px-1 text-xs font-medium text-ink">Lotes</legend>
            {lots.map((lot) => (
              <label key={lot.id} className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  name="lotIds"
                  value={lot.id}
                  checked={selectedIds.includes(lot.id)}
                  onChange={() => toggle(lot.id)}
                />
                <span>{lot.name}</span>
                <span className="text-xs text-muted">
                  {countOf(lot.productCount, "producto", "productos")}
                </span>
              </label>
            ))}
            {errors.lotIds ? (
              <p id="lotIds-error" className="text-xs text-warn">
                {errors.lotIds}
              </p>
            ) : null}
          </fieldset>
        ) : null}

        <p className="text-sm text-muted">
          {scope === "new"
            ? "Solo se guardan los valores por defecto."
            : `${targets.length === 1 ? "Se recalcula" : "Se recalculan"} ${countOf(targets.length, "lote", "lotes")} · ${countOf(products, "producto", "productos")}`}
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : scope === "new" ? "Guardar" : "Guardar y aplicar"}
        </Button>
        <FormMessage state={state} />
      </form>

      <section className="flex flex-col gap-4 self-start border border-line bg-surface p-5">
        <h2 id="formula-title" className="font-display text-2xl text-ink">
          Cómo se calcula el precio
        </h2>
        <ol aria-labelledby="formula-title" className="divide-y divide-line border-y border-line">
          {FORMULA_STEPS.map((step, index) => (
            <li key={step.label} className="flex gap-4 py-3">
              <span className="pt-0.5 text-xs tabular-nums text-muted">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-[0.12em] text-muted">{step.label}</span>
                <span className="text-sm text-ink">{step.formula}</span>
                {step.note ? <span className="text-xs text-muted">{step.note}</span> : null}
              </div>
            </li>
          ))}
        </ol>
        <p className="text-xs text-muted">
          Al aplicar, cada lote elegido toma de acá el TC, el factor, el IVA y el % de costo, y
          conserva su propio envío.
        </p>
      </section>
    </div>
  );
}
