"use client";

import type { BankPromoKind } from "@atika/pricing";
import { Button, cn, Input, Switch } from "@atika/ui";
import Link from "next/link";
import { useActionState, useState } from "react";
import { type FormState, IDLE } from "../lib/action-state";
import { promoPreview } from "../lib/bank-promos/workspace";
import type { LotOption, PromoBankRef } from "../lib/queries/bank-promos";
import type { PickerProduct } from "../lib/queries/discounts";
import { BankLogo } from "./bank-logo";
import { BankPromoPreview } from "./bank-promo-preview";
import { ConfirmDeleteButton } from "./confirm-delete-button";
import { Field, FormMessage } from "./form-controls";
import { ProductPicker } from "./product-picker";
import { SegmentedButtons } from "./segmented";

type Action = (previous: FormState, formData: FormData) => Promise<FormState>;
type Scope = "all" | "lots" | "products";

export interface BankPromoFormInitial {
  name: string;
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
  name: "",
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

const KIND_OPTIONS = [
  ["installments", "Cuotas"],
  ["refund", "Reintegro"],
  ["discount", "Descuento"],
] as const;

const SCOPE_OPTIONS = [
  ["all", "Todos los productos"],
  ["lots", "Marcas"],
  ["products", "Productos"],
] as const;

const DAYS: readonly [number, string, string][] = [
  [1, "Lunes", "L"],
  [2, "Martes", "M"],
  [3, "Miércoles", "X"],
  [4, "Jueves", "J"],
  [5, "Viernes", "V"],
  [6, "Sábado", "S"],
  [7, "Domingo", "D"],
];

function toggled<T>(list: readonly T[], item: T, on: boolean): T[] {
  const without = list.filter((entry) => entry !== item);
  return on ? [...without, item] : without;
}

const PANEL = "flex min-w-0 flex-col gap-3";
const LEGEND = "text-xs font-medium text-ink";

/**
 * Right pane of the promos screen: edit (or start) one bank promo with a live preview of what the
 * customer sees. Every field is controlled so the preview follows what is typed before saving.
 */
export function BankPromoForm({
  promoId,
  savedHeadline,
  banks,
  lots,
  products,
  initial = EMPTY_BANK_PROMO,
  action,
  remove,
}: {
  /** Null while creating. */
  promoId: string | null;
  /** Headline of the saved promo, shown as the title; null while creating. */
  savedHeadline: string | null;
  banks: PromoBankRef[];
  lots: LotOption[];
  products: PickerProduct[];
  initial?: BankPromoFormInitial;
  action: Action;
  remove?: { action: (promoId: string) => Promise<FormState>; redirectTo: string };
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  const [name, setName] = useState(initial.name);
  const [kind, setKind] = useState(initial.kind);
  const [value, setValue] = useState(initial.value);
  const [capGs, setCapGs] = useState(initial.capGs);
  const [startsAt, setStartsAt] = useState(initial.startsAt);
  const [endsAt, setEndsAt] = useState(initial.endsAt);
  const [terms, setTerms] = useState(initial.terms);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [scope, setScope] = useState(initial.scope);
  const [bankIds, setBankIds] = useState(initial.bankIds);
  const [days, setDays] = useState(initial.days);
  const [lotIds, setLotIds] = useState(initial.lotIds);
  const [productIds, setProductIds] = useState(initial.productIds);

  const preview = promoPreview(
    {
      kind,
      value,
      capGs,
      startsAt,
      endsAt,
      scope,
      bankIds,
      days,
      lotIds,
      productCount: productIds.length,
    },
    banks,
    lots,
  );

  const invalid = (name: string) => ({
    "aria-invalid": errors[name] ? (true as const) : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="scope" value={scope} />
      {isActive ? <input type="hidden" name="isActive" value="on" /> : null}
      {banks
        .filter((bank) => bankIds.includes(bank.id))
        .map((bank) => (
          <input key={bank.id} type="hidden" name="bankIds" value={bank.id} />
        ))}
      {DAYS.filter(([day]) => days.includes(day)).map(([day]) => (
        <input key={day} type="hidden" name="days" value={day} />
      ))}
      {scope === "products"
        ? products
            .filter((product) => productIds.includes(product.id))
            .map((product) => (
              <input key={product.id} type="hidden" name="productIds" value={product.id} />
            ))
        : null}

      <header className="flex items-start justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            {promoId ? "Editar promoción" : "Nueva promoción"}
          </p>
          <h2 className="font-display text-3xl text-ink">{savedHeadline ?? "Nueva promoción"}</h2>
        </div>
        <div className="flex shrink-0 items-start gap-3">
          {remove && promoId ? (
            <ConfirmDeleteButton
              id={promoId}
              name={savedHeadline ?? "Nueva promoción"}
              noun="la promoción"
              action={remove.action}
              redirectTo={remove.redirectTo}
              variant="outlined"
            />
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </header>

      <FormMessage state={state} />

      <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Field label="Nombre" htmlFor="name" error={errors.name}>
            <Input
              id="name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej.: Itaú 20% fines de semana"
              maxLength={80}
              {...invalid("name")}
            />
          </Field>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink">Tipo</span>
            <SegmentedButtons label="Tipo" options={KIND_OPTIONS} value={kind} onChange={setKind} />
            {errors.kind ? <span className="text-xs text-warn">{errors.kind}</span> : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <Input
                id="value"
                name="value"
                inputMode="numeric"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                {...invalid("value")}
              />
            </Field>
            <Field
              label="Tope (₲)"
              htmlFor="capGs"
              error={errors.capGs}
              hint="Opcional. Máximo que se devuelve o descuenta."
            >
              <Input
                id="capGs"
                name="capGs"
                inputMode="numeric"
                value={capGs}
                onChange={(event) => setCapGs(event.target.value)}
                {...invalid("capGs")}
              />
            </Field>
          </div>

          <fieldset className={PANEL}>
            <legend className={LEGEND}>Bancos</legend>
            {banks.length === 0 ? (
              <p className="text-sm text-muted">
                Primero cargá al menos un banco.{" "}
                <Link
                  href="/promos/bancos?tab=bancos&nuevo=1"
                  className="text-ink underline underline-offset-4"
                >
                  Ir a Bancos
                </Link>
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {banks.map((bank) => {
                  const on = bankIds.includes(bank.id);
                  return (
                    <button
                      key={bank.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setBankIds(toggled(bankIds, bank.id, !on))}
                      className={cn(
                        "inline-flex items-center border-2 bg-surface p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                        on ? "border-ink" : "border-line hover:border-muted",
                      )}
                    >
                      <BankLogo name={bank.name} logoUrl={bank.logoUrl} />
                    </button>
                  );
                })}
              </div>
            )}
            {errors.bankIds ? (
              <p role="alert" className="text-xs text-warn">
                {errors.bankIds}
              </p>
            ) : null}
          </fieldset>

          <fieldset className={PANEL}>
            <legend className={LEGEND}>Días</legend>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(([day, name, letter]) => {
                const on = days.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={on}
                    aria-label={name}
                    onClick={() => setDays(toggled(days, day, !on))}
                    className={cn(
                      "size-10 border text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                      on
                        ? "border-ink bg-ink text-surface"
                        : "border-line bg-surface text-ink hover:bg-subtle",
                    )}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted">
              Si no elegís ningún día, la promo vale todos los días.
            </p>
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink">Alcance</span>
            <SegmentedButtons
              label="Alcance"
              options={SCOPE_OPTIONS}
              value={scope}
              onChange={setScope}
            />
            {errors.scope ? <span className="text-xs text-warn">{errors.scope}</span> : null}
          </div>

          {scope === "lots" ? (
            <fieldset className="flex min-w-0 flex-col gap-2 border border-line bg-surface p-4">
              <legend className="px-2 text-xs font-medium text-ink">Marcas de la promoción</legend>
              {lots.length === 0 ? (
                <p className="text-sm text-muted">Todavía no hay marcas.</p>
              ) : null}
              <ul className="flex max-h-72 flex-col overflow-y-auto">
                {lots.map((lot) => (
                  <li key={lot.id} className="border-b border-line last:border-b-0">
                    <label className="flex cursor-pointer items-center gap-3 px-1 py-2 text-sm">
                      <input
                        type="checkbox"
                        name="lotIds"
                        value={lot.id}
                        checked={lotIds.includes(lot.id)}
                        onChange={(event) =>
                          setLotIds(toggled(lotIds, lot.id, event.target.checked))
                        }
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
            <ProductPicker
              products={products}
              selectedIds={productIds}
              onChange={setProductIds}
              error={errors.productIds}
              legend="Productos de la promoción"
            />
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Desde" htmlFor="startsAt" error={errors.startsAt} hint="Opcional.">
              <Input
                id="startsAt"
                name="startsAt"
                type="date"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
                {...invalid("startsAt")}
              />
            </Field>
            <Field
              label="Hasta"
              htmlFor="endsAt"
              error={errors.endsAt}
              hint="Opcional. Ese día todavía vale la promo."
            >
              <Input
                id="endsAt"
                name="endsAt"
                type="date"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
                {...invalid("endsAt")}
              />
            </Field>
          </div>

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
              value={terms}
              onChange={(event) => setTerms(event.target.value)}
              {...invalid("terms")}
              className="w-full rounded-none border border-line bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink"
            />
          </Field>

          <div className="flex items-center gap-3">
            <Switch checked={isActive} onCheckedChange={setIsActive} aria-label="Activa" />
            <span className="text-sm text-ink">Activa</span>
          </div>
        </div>

        <div className="xl:sticky xl:top-8">
          <BankPromoPreview preview={preview} />
        </div>
      </div>
    </form>
  );
}
