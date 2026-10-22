"use client";

import { Button, Input } from "@atika/ui";
import { useActionState, useState } from "react";
import { type FormState, IDLE } from "../lib/action-state";
import type { CurrencyDisplay } from "../lib/currency";
import { countOf } from "../lib/format";
import type { AppSettingsView } from "../lib/queries/settings";
import type { PreviewLot } from "../lib/settings/preview";
import { Field, FormMessage } from "./form-controls";
import { LotPricePreview } from "./lot-price-preview";

type Action = (previous: FormState, formData: FormData) => Promise<FormState>;

const FIELDS = [
  { name: "exchangeRate", label: "TC del día (₲ / US$)", key: "exchangeRate" },
  { name: "saleFactor", label: "Factor de venta por defecto", key: "saleFactor" },
  { name: "vatPercent", label: "IVA (%)", key: "vatPercent" },
  { name: "costPercent", label: "Costo sobre valor original (%)", key: "costPercent" },
] as const satisfies readonly { name: string; label: string; key: keyof AppSettingsView }[];

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
  display,
}: {
  settings: AppSettingsView;
  lots: PreviewLot[];
  action: Action;
  display?: CurrencyDisplay;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  const [typed, setTyped] = useState<Record<string, string>>(() =>
    Object.fromEntries(FIELDS.map((field) => [field.name, String(settings[field.key])])),
  );
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  const products = lots.reduce((sum, lot) => sum + lot.products.length, 0);

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
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
                value={typed[field.name] ?? ""}
                onChange={(event) =>
                  setTyped((current) => ({ ...current, [field.name]: event.target.value }))
                }
                aria-invalid={errors[field.name] ? true : undefined}
                aria-describedby={errors[field.name] ? `${field.name}-error` : undefined}
              />
            </Field>
          ))}

          <p className="text-sm text-muted">
            {`${lots.length === 1 ? "Se recalcula" : "Se recalculan"} ${countOf(lots.length, "lote", "lotes")} · ${countOf(products, "producto", "productos")}`}
          </p>
          <Button type="submit" disabled={pending}>
            {pending ? "Aplicando…" : "Aplicar"}
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
                  <span className="text-xs uppercase tracking-[0.12em] text-muted">
                    {step.label}
                  </span>
                  <span className="text-sm text-ink">{step.formula}</span>
                  {step.note ? <span className="text-xs text-muted">{step.note}</span> : null}
                </div>
              </li>
            ))}
          </ol>
          <p className="text-xs text-muted">
            Al guardar, todos los lotes toman de acá el TC, el factor, el IVA y el % de costo, y
            conservan su propio envío.
          </p>
        </section>
      </div>
      <LotPricePreview lots={lots} values={typed} display={display} />
    </div>
  );
}
