"use client";

import type { LotPricingMode } from "@atika/db";
import { Button, cn, Input } from "@atika/ui";
import Link from "next/link";
import { useActionState, useState } from "react";
import { type FormState, IDLE } from "../lib/action-state";
import type { AppSettingsView } from "../lib/queries/settings";
import { Field, FormMessage } from "./form-controls";

type Action = (previous: FormState, formData: FormData) => Promise<FormState>;

const NUMBER = new Intl.NumberFormat("es-PY", { maximumFractionDigits: 4 });

type ParamKey = keyof AppSettingsView;

const FIELDS = [
  {
    name: "exchangeRate",
    label: "TC del lote (₲ / US$)",
    readOnlyLabel: "Tipo de cambio (₲ / US$)",
  },
  { name: "saleFactor", label: "Factor de venta", readOnlyLabel: "Factor de venta" },
  { name: "vatPercent", label: "IVA (%)", readOnlyLabel: "IVA (%)" },
  {
    name: "costPercent",
    label: "Costo sobre valor original (%)",
    readOnlyLabel: "Costo sobre valor original (%)",
  },
] as const satisfies readonly {
  name: ParamKey;
  label: string;
  readOnlyLabel: string;
}[];

const MODES = [
  ["global", "Global"],
  ["custom", "Propio"],
] as const satisfies readonly (readonly [LotPricingMode, string])[];

/** A typed value differs from the global one when it parses and is not equal (decimal comma ok). */
function differs(typed: string | undefined, global: number): boolean {
  if (typed === undefined || typed.trim() === "") return false;
  const value = Number(typed.trim().replace(",", "."));
  return Number.isFinite(value) && value !== global;
}

/**
 * Pricing parameters of a lot: it either follows Parámetros (`global`, read-only here) or uses its
 * own values edited here (`custom`), which flag what differs from the global ones.
 */
export function LotPricingPanel({
  mode,
  params,
  globalSettings,
  modeAction,
  paramsAction,
}: {
  mode: LotPricingMode;
  params: AppSettingsView;
  globalSettings: AppSettingsView;
  modeAction: Action;
  paramsAction: Action;
}) {
  const [modeState, modeFormAction, modePending] = useActionState(modeAction, IDLE);

  return (
    <section
      aria-labelledby="lot-pricing-title"
      className="flex flex-col gap-4 border border-line bg-surface p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="lot-pricing-title" className="font-display text-2xl text-ink">
          Precios del lote
        </h2>
        <span className="bg-subtle px-2.5 py-1 text-xs font-medium text-ok">
          Activo: {mode === "global" ? "Global" : "Propio"}
        </span>
      </div>

      <form action={modeFormAction} className="flex flex-col gap-2">
        <fieldset
          aria-label="Modo de precios"
          className="m-0 grid min-w-0 grid-cols-2 border border-line p-0"
        >
          {MODES.map(([value, label]) => {
            const on = mode === value;
            return (
              <button
                key={value}
                type="submit"
                name="mode"
                value={value}
                aria-pressed={on}
                disabled={on || modePending}
                className={cn(
                  "h-10 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                  on ? "bg-ink text-surface" : "bg-surface text-ink hover:bg-subtle",
                )}
              >
                {label}
              </button>
            );
          })}
        </fieldset>
        <FormMessage state={modeState} />
      </form>

      {mode === "global" ? (
        <>
          <dl className="flex flex-col gap-2 text-sm">
            {FIELDS.map((field) => (
              <div key={field.name} className="flex justify-between gap-4">
                <dt className="text-muted">{field.readOnlyLabel}</dt>
                <dd className="text-ink">{NUMBER.format(params[field.name])}</dd>
              </div>
            ))}
          </dl>
          <Link href="/parametros" className="text-sm text-ink underline underline-offset-4">
            Editar en Parámetros
          </Link>
        </>
      ) : (
        <CustomParamsForm
          // Remount when saved values change so the inputs restart from the stored ones.
          key={FIELDS.map((field) => params[field.name]).join("|")}
          params={params}
          globalSettings={globalSettings}
          action={paramsAction}
        />
      )}
    </section>
  );
}

function CustomParamsForm({
  params,
  globalSettings,
  action,
}: {
  params: AppSettingsView;
  globalSettings: AppSettingsView;
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  const [typed, setTyped] = useState<Record<string, string>>(() =>
    Object.fromEntries(FIELDS.map((field) => [field.name, String(params[field.name])])),
  );
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {FIELDS.map((field) => (
        <Field
          key={field.name}
          label={field.label}
          htmlFor={`lot-${field.name}`}
          error={errors[field.name]}
          hint={
            differs(typed[field.name], globalSettings[field.name])
              ? `Difiere del global (${NUMBER.format(globalSettings[field.name])})`
              : undefined
          }
        >
          <Input
            id={`lot-${field.name}`}
            name={field.name}
            type="number"
            step="any"
            required
            value={typed[field.name] ?? ""}
            onChange={(event) =>
              setTyped((current) => ({ ...current, [field.name]: event.target.value }))
            }
            aria-invalid={errors[field.name] ? true : undefined}
            aria-describedby={errors[field.name] ? `lot-${field.name}-error` : undefined}
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
