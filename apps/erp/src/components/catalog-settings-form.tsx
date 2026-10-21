"use client";

import { Button, Input, Switch } from "@atika/ui";
import { useActionState, useState } from "react";
import { type FormState, IDLE } from "../lib/action-state";
import type { CatalogSettingsView } from "../lib/queries/catalog";
import { Field, FormMessage } from "./form-controls";

type Action = (previous: FormState, formData: FormData) => Promise<FormState>;

/** A switch that submits `name=on` with the form only while it is on. */
function SwitchField({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-ink">{label}</span>
      <Switch checked={checked} onCheckedChange={setChecked} aria-label={label} />
      {checked ? <input type="hidden" name={name} value="on" /> : null}
    </div>
  );
}

export function CatalogSettingsForm({
  settings,
  action,
}: {
  settings: CatalogSettingsView;
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const values = state.status === "error" ? (state.values ?? {}) : {};
  const invalid = (name: string) => ({
    "aria-invalid": errors[name] ? (true as const) : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  return (
    <form action={formAction} className="flex flex-col gap-4 border border-line bg-surface p-5">
      <h2 className="font-display text-2xl text-ink">Configuración del catálogo</h2>
      <Field label="Número de WhatsApp" htmlFor="whatsappNumber" error={errors.whatsappNumber}>
        <Input
          id="whatsappNumber"
          name="whatsappNumber"
          required
          defaultValue={values.whatsappNumber ?? settings.whatsappNumber}
          {...invalid("whatsappNumber")}
        />
      </Field>
      <Field
        label="Mensaje"
        htmlFor="messageTemplate"
        error={errors.messageTemplate}
        hint="Usá {producto} y {talle}. Sin talle elegido, se omite la parte del talle."
      >
        <textarea
          id="messageTemplate"
          name="messageTemplate"
          required
          rows={3}
          defaultValue={values.messageTemplate ?? settings.messageTemplate}
          className="w-full rounded-none border border-line bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink"
          {...invalid("messageTemplate")}
        />
      </Field>
      <Field label="Texto de portada" htmlFor="heroText" error={errors.heroText}>
        <Input
          id="heroText"
          name="heroText"
          required
          defaultValue={values.heroText ?? settings.heroText}
          {...invalid("heroText")}
        />
      </Field>
      <div className="flex flex-col gap-3 border-t border-line pt-4">
        <SwitchField
          name="showPrices"
          label="Mostrar precios"
          defaultChecked={settings.showPrices}
        />
        <SwitchField
          name="showSoldOutSizes"
          label="Mostrar talles agotados"
          defaultChecked={settings.showSoldOutSizes}
        />
        <SwitchField
          name="hideOutOfStock"
          label="Ocultar productos sin stock"
          defaultChecked={settings.hideOutOfStock}
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar configuración"}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
