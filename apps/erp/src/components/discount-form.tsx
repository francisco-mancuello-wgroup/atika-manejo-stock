"use client";

import { Button, Input } from "@atika/ui";
import Link from "next/link";
import { useActionState, useState } from "react";
import { type FormState, IDLE } from "../lib/action-state";
import type { PickerProduct } from "../lib/queries/discounts";
import { Field, FormMessage } from "./form-controls";
import { ProductPicker } from "./product-picker";

type Action = (previous: FormState, formData: FormData) => Promise<FormState>;

export interface DiscountFormInitial {
  name: string;
  percent: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  scope: "all" | "selected";
  productIds: string[];
}

export const EMPTY_DISCOUNT: DiscountFormInitial = {
  name: "",
  percent: "",
  isActive: true,
  startsAt: "",
  endsAt: "",
  scope: "all",
  productIds: [],
};

/** Create or edit one discount: fields, validity window and, for "selected", the product picker. */
export function DiscountForm({
  products,
  initial = EMPTY_DISCOUNT,
  action,
}: {
  products: PickerProduct[];
  initial?: DiscountFormInitial;
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const values = state.status === "error" ? (state.values ?? {}) : {};
  const [scope, setScope] = useState(initial.scope);
  const [selectedIds, setSelectedIds] = useState(initial.productIds);

  const text = (name: "name" | "percent" | "startsAt" | "endsAt") => ({
    id: name,
    name,
    defaultValue: values[name] ?? initial[name],
    "aria-invalid": errors[name] ? (true as const) : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });
  const hasValues = state.status === "error" && state.values !== undefined;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <section className="grid grid-cols-1 gap-4 border border-line bg-surface p-5 md:grid-cols-2">
        <Field label="Nombre" htmlFor="name" error={errors.name}>
          <Input {...text("name")} />
        </Field>
        <Field
          label="Porcentaje"
          htmlFor="percent"
          error={errors.percent}
          hint="Entre 1 y 90. Se descuenta del precio de lista."
        >
          <Input {...text("percent")} inputMode="numeric" />
        </Field>
        <Field label="Desde" htmlFor="startsAt" error={errors.startsAt} hint="Opcional.">
          <Input {...text("startsAt")} type="date" />
        </Field>
        <Field
          label="Hasta"
          htmlFor="endsAt"
          error={errors.endsAt}
          hint="Opcional. Ese día todavía vale el descuento."
        >
          <Input {...text("endsAt")} type="date" />
        </Field>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={hasValues ? values.isActive === "on" : initial.isActive}
          />
          Activo
        </label>
      </section>

      <section className="flex flex-col gap-3 border border-line bg-surface p-5">
        <h2 className="font-display text-2xl text-ink">Alcance</h2>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="radio"
            name="scope"
            value="all"
            checked={scope === "all"}
            onChange={() => setScope("all")}
          />
          Todos los productos
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="radio"
            name="scope"
            value="selected"
            checked={scope === "selected"}
            onChange={() => setScope("selected")}
          />
          Seleccionar productos
        </label>
        {errors.scope ? <p className="text-xs text-warn">{errors.scope}</p> : null}
      </section>

      {scope === "selected" ? (
        <>
          <ProductPicker
            products={products}
            selectedIds={selectedIds}
            onChange={setSelectedIds}
            error={errors.productIds}
          />
          {products
            .filter((product) => selectedIds.includes(product.id))
            .map((product) => (
              <input key={product.id} type="hidden" name="productIds" value={product.id} />
            ))}
        </>
      ) : null}

      <FormMessage state={state} />
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
        <Link href="/descuentos" className="text-sm text-muted underline-offset-4 hover:underline">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
