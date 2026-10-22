"use client";

import type { BankPromoKind } from "@atika/pricing";
import { Button, Input } from "@atika/ui";
import Image from "next/image";
import Link from "next/link";
import { useActionState, useState } from "react";
import { type FormState, IDLE } from "../lib/action-state";
import type { LotOption, PromoBankRef } from "../lib/queries/bank-promos";
import type { PickerProduct } from "../lib/queries/discounts";
import { Field, FormMessage, Select } from "./form-controls";
import { ProductPicker } from "./product-picker";

type Action = (previous: FormState, formData: FormData) => Promise<FormState>;
type Scope = "all" | "lots" | "products";

export interface BankPromoFormInitial {
  kind: BankPromoKind;
  value: string;
  capGs: string;
  startsAt: string;
  endsAt: string;
  terms: string;
  isActive: boolean;
  scope: Scope;
  bankIds: string[];
  /** ISO weekdays; none = every day. */
  days: number[];
  lotIds: string[];
  productIds: string[];
}

export const EMPTY_BANK_PROMO: BankPromoFormInitial = {
  kind: "installments",
  value: "",
  capGs: "",
  startsAt: "",
  endsAt: "",
  terms: "",
  isActive: true,
  scope: "all",
  bankIds: [],
  days: [],
  lotIds: [],
  productIds: [],
};

const KIND_LABELS: Record<BankPromoKind, string> = {
  installments: "Cuotas sin intereses",
  refund: "Reintegro",
  discount: "Descuento",
};

const DAYS: readonly [number, string][] = [
  [1, "Lunes"],
  [2, "Martes"],
  [3, "Miércoles"],
  [4, "Jueves"],
  [5, "Viernes"],
  [6, "Sábado"],
  [7, "Domingo"],
];

function toggled<T>(list: readonly T[], item: T, on: boolean): T[] {
  const without = list.filter((entry) => entry !== item);
  return on ? [...without, item] : without;
}

/** Create or edit one bank promo: benefit, banks, days, cap, window, terms and scope. */
export function BankPromoForm({
  banks,
  lots,
  products,
  initial = EMPTY_BANK_PROMO,
  action,
}: {
  banks: PromoBankRef[];
  lots: LotOption[];
  products: PickerProduct[];
  initial?: BankPromoFormInitial;
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const values = state.status === "error" ? (state.values ?? {}) : {};
  const hasValues = state.status === "error" && state.values !== undefined;

  const [kind, setKind] = useState(initial.kind);
  const [scope, setScope] = useState(initial.scope);
  const [bankIds, setBankIds] = useState(initial.bankIds);
  const [days, setDays] = useState(initial.days);
  const [lotIds, setLotIds] = useState(initial.lotIds);
  const [productIds, setProductIds] = useState(initial.productIds);

  const text = (name: "value" | "capGs" | "startsAt" | "endsAt") => ({
    id: name,
    name,
    defaultValue: values[name] ?? initial[name],
    "aria-invalid": errors[name] ? (true as const) : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <section className="grid grid-cols-1 gap-4 border border-line bg-surface p-5 md:grid-cols-2">
        <Field label="Tipo" htmlFor="kind" error={errors.kind}>
          <Select
            id="kind"
            name="kind"
            value={kind}
            onChange={(event) => setKind(event.target.value as BankPromoKind)}
          >
            {(Object.keys(KIND_LABELS) as BankPromoKind[]).map((option) => (
              <option key={option} value={option}>
                {KIND_LABELS[option]}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label={kind === "installments" ? "Cuotas" : "Porcentaje"}
          htmlFor="value"
          error={errors.value}
          hint={
            kind === "installments"
              ? "Hasta cuántas cuotas, entre 2 y 48."
              : "Entre 1 y 100. Se muestra como reintegro o descuento."
          }
        >
          <Input {...text("value")} inputMode="numeric" />
        </Field>
        <Field
          label="Tope (₲)"
          htmlFor="capGs"
          error={errors.capGs}
          hint="Opcional. Máximo que se devuelve o descuenta, en guaraníes."
        >
          <Input {...text("capGs")} inputMode="numeric" />
        </Field>
        <div className="hidden md:block" />
        <Field label="Desde" htmlFor="startsAt" error={errors.startsAt} hint="Opcional.">
          <Input {...text("startsAt")} type="date" />
        </Field>
        <Field
          label="Hasta"
          htmlFor="endsAt"
          error={errors.endsAt}
          hint="Opcional. Ese día todavía vale la promo."
        >
          <Input {...text("endsAt")} type="date" />
        </Field>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={hasValues ? values.isActive === "on" : initial.isActive}
          />
          Activa
        </label>
      </section>

      <fieldset className="flex flex-col gap-3 border border-line bg-surface p-5">
        <legend className="px-2 text-xs font-medium text-ink">Bancos</legend>
        {banks.length === 0 ? (
          <p className="text-sm text-muted">
            Primero cargá al menos un banco.{" "}
            <Link href="/promos/bancos" className="text-ink underline underline-offset-4">
              Ir a Bancos
            </Link>
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {banks.map((bank) => (
              <li key={bank.id}>
                <label className="flex cursor-pointer items-center gap-3 text-sm text-ink">
                  <input
                    type="checkbox"
                    name="bankIds"
                    value={bank.id}
                    checked={bankIds.includes(bank.id)}
                    onChange={(event) =>
                      setBankIds(toggled(bankIds, bank.id, event.target.checked))
                    }
                  />
                  {bank.logoUrl ? (
                    <Image
                      src={bank.logoUrl}
                      alt=""
                      width={64}
                      height={32}
                      sizes="64px"
                      className="h-8 w-16 object-contain"
                    />
                  ) : null}
                  <span>{bank.name}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        {errors.bankIds ? (
          <p role="alert" className="text-xs text-warn">
            {errors.bankIds}
          </p>
        ) : null}
      </fieldset>

      <fieldset className="flex flex-col gap-3 border border-line bg-surface p-5">
        <legend className="px-2 text-xs font-medium text-ink">Días</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {DAYS.map(([day, name]) => (
            <label key={day} className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="days"
                value={day}
                checked={days.includes(day)}
                onChange={(event) => setDays(toggled(days, day, event.target.checked))}
              />
              {name}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted">Si no elegís ningún día, la promo vale todos los días.</p>
      </fieldset>

      <section className="flex flex-col gap-3 border border-line bg-surface p-5">
        <h2 className="font-display text-2xl text-ink">Alcance</h2>
        {(
          [
            ["all", "Todos los productos"],
            ["lots", "Lotes"],
            ["products", "Productos"],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="flex items-center gap-2 text-sm text-ink">
            <input
              type="radio"
              name="scope"
              value={value}
              checked={scope === value}
              onChange={() => setScope(value)}
            />
            {label}
          </label>
        ))}
        {errors.scope ? <p className="text-xs text-warn">{errors.scope}</p> : null}
      </section>

      {scope === "lots" ? (
        <fieldset className="flex flex-col gap-3 border border-line bg-surface p-5">
          <legend className="px-2 text-xs font-medium text-ink">Lotes de la promoción</legend>
          <ul className="flex max-h-[28rem] flex-col overflow-y-auto">
            {lots.map((lot) => (
              <li key={lot.id} className="border-b border-line last:border-b-0">
                <label className="flex cursor-pointer items-center gap-3 px-1 py-2 text-sm">
                  <input
                    type="checkbox"
                    name="lotIds"
                    value={lot.id}
                    checked={lotIds.includes(lot.id)}
                    onChange={(event) => setLotIds(toggled(lotIds, lot.id, event.target.checked))}
                  />
                  <span className="flex-1 font-medium text-ink">{lot.name}</span>
                  <span className="text-muted">
                    {`${lot.productCount} ${lot.productCount === 1 ? "producto" : "productos"}`}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {errors.lotIds ? (
            <p role="alert" className="text-xs text-warn">
              {errors.lotIds}
            </p>
          ) : null}
        </fieldset>
      ) : null}

      {scope === "products" ? (
        <>
          <ProductPicker
            products={products}
            selectedIds={productIds}
            onChange={setProductIds}
            error={errors.productIds}
            legend="Productos de la promoción"
          />
          {products
            .filter((product) => productIds.includes(product.id))
            .map((product) => (
              <input key={product.id} type="hidden" name="productIds" value={product.id} />
            ))}
        </>
      ) : null}

      <section className="border border-line bg-surface p-5">
        <Field
          label="Bases y condiciones"
          htmlFor="terms"
          error={errors.terms}
          hint="Opcional. Se muestra en la página de promociones bancarias del catálogo."
        >
          <textarea
            id="terms"
            name="terms"
            rows={5}
            defaultValue={values.terms ?? initial.terms}
            aria-invalid={errors.terms ? true : undefined}
            aria-describedby={errors.terms ? "terms-error" : undefined}
            className="w-full rounded-none border border-line bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink"
          />
        </Field>
      </section>

      <FormMessage state={state} />
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
        <Link
          href="/promos/bancos"
          className="text-sm text-muted underline-offset-4 hover:underline"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
