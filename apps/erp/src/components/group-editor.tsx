"use client";

import type { Catalog } from "@atika/db";
import { CATALOG_CATEGORIES } from "@atika/db/categories";
import { Button, Input } from "@atika/ui";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { type FormState, IDLE } from "../lib/action-state";
import type { ProductFilter } from "../lib/catalog-groups/groups";
import { remaining } from "../lib/catalog-groups/stock";
import type { GroupDetail, GroupOptions, GroupProduct } from "../lib/queries/catalog-groups";
import type { PickerProduct } from "../lib/queries/discounts";
import { ConfirmDeleteButton } from "./confirm-delete-button";
import { Field, FormMessage, Select } from "./form-controls";
import type { GroupsViewActions } from "./groups-view";

type Criterion = "lote" | "catalogo" | "categoria" | "marca";

const CRITERIA: readonly [Criterion, string][] = [
  ["lote", "Lote"],
  ["catalogo", "Catálogo"],
  ["categoria", "Categoría"],
  ["marca", "Marca"],
];

const LOOKBOOKS: readonly [Catalog, string][] = [
  ["casa_icona", "Casa Icona"],
  ["milonga", "Milonga"],
  ["sordo", "Sordo"],
];

const MAX_SEARCH_RESULTS = 8;

function filterFor(criterion: Criterion, value: string): ProductFilter {
  switch (criterion) {
    case "lote":
      return { lotId: value };
    case "catalogo":
      return { catalog: value as Catalog };
    case "categoria":
      return { category: value };
    case "marca":
      return { brand: value };
  }
}

function valueOptions(criterion: Criterion, options: GroupOptions): [string, string][] {
  switch (criterion) {
    case "lote":
      return options.lots.map((lot) => [lot.id, lot.name]);
    case "catalogo":
      return LOOKBOOKS.map(([value, label]) => [value, label]);
    case "categoria":
      return CATALOG_CATEGORIES.map((category) => [category.slug, category.label]);
    case "marca":
      return options.brands.map((brand) => [brand, brand]);
  }
}

const toNumber = (text: string | undefined) => {
  const value = Number(text);
  return Number.isInteger(value) && value >= 0 ? value : 0;
};

/** Result line of an action that is not a form: a refusal reads as an alert, a success as a status. */
function Outcome({ state }: { state: FormState | null }) {
  return state ? <FormMessage state={state} /> : null;
}

function GroupForm({
  detail,
  action,
  closeHref,
}: {
  detail: GroupDetail | null;
  action: GroupsViewActions["saveGroup"];
  closeHref: string;
}) {
  const [state, formAction, pending] = useActionState(action.bind(null, detail?.id ?? null), IDLE);
  const values = state.status === "error" ? state.values : undefined;
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-2xl text-ink">{detail ? detail.name : "Nuevo grupo"}</h2>
        <Link href={closeHref} className="text-sm text-muted underline-offset-4 hover:underline">
          Cerrar
        </Link>
      </div>
      <Field label="Nombre" htmlFor="group-name" error={errors.name}>
        <Input
          id="group-name"
          name="name"
          maxLength={80}
          defaultValue={values?.name ?? detail?.name ?? ""}
          aria-invalid={errors.name ? true : undefined}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Desde"
          htmlFor="group-starts"
          error={errors.startsAt}
          hint="Vacío: sin inicio."
        >
          <Input
            id="group-starts"
            name="startsAt"
            type="date"
            defaultValue={values?.startsAt ?? detail?.startsAt ?? ""}
          />
        </Field>
        <Field label="Hasta" htmlFor="group-ends" error={errors.endsAt} hint="Vacío: sin fin.">
          <Input
            id="group-ends"
            name="endsAt"
            type="date"
            defaultValue={values?.endsAt ?? detail?.endsAt ?? ""}
          />
        </Field>
      </div>
      <FormMessage state={state} />
      <div>
        <Button type="submit" disabled={pending}>
          {detail ? "Guardar grupo" : "Crear grupo"}
        </Button>
      </div>
    </form>
  );
}

function AddProducts({
  groupId,
  inGroup,
  options,
  products,
  add,
}: {
  groupId: string;
  inGroup: ReadonlySet<string>;
  options: GroupOptions;
  products: PickerProduct[];
  add: GroupsViewActions["addProducts"];
}) {
  const [criterion, setCriterion] = useState<Criterion>("lote");
  const [value, setValue] = useState("");
  const [query, setQuery] = useState("");
  const [outcome, setOutcome] = useState<FormState | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (filter: ProductFilter) =>
    startTransition(async () => setOutcome(await add(groupId, filter)));

  const needle = query.trim().toLocaleLowerCase("es");
  const matches = needle
    ? products
        .filter((product) => !inGroup.has(product.id))
        .filter((product) => product.name.toLocaleLowerCase("es").includes(needle))
        .slice(0, MAX_SEARCH_RESULTS)
    : [];

  return (
    <section aria-labelledby="group-add-title" className="flex flex-col gap-4">
      <h3 id="group-add-title" className="text-sm font-medium text-ink">
        Agregar prendas
      </h3>
      <fieldset className="flex min-w-0 flex-wrap items-end gap-3 border-0 p-0">
        <legend className="sr-only">Agregar por</legend>
        <div className="w-36">
          <Field label="Criterio" htmlFor="group-criterion">
            <Select
              id="group-criterion"
              value={criterion}
              onChange={(event) => {
                setCriterion(event.target.value as Criterion);
                setValue("");
              }}
            >
              {CRITERIA.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="min-w-40 flex-1">
          <Field label="Valor" htmlFor="group-value">
            <Select
              id="group-value"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            >
              <option value="">Elegí…</option>
              {valueOptions(criterion, options).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={pending || value === ""}
          onClick={() => run(filterFor(criterion, value))}
        >
          Agregar
        </Button>
      </fieldset>
      <p className="text-xs text-muted">
        Suma todos los talles con stock libre; después ajustás las cantidades.
      </p>

      <Field label="Buscar prenda" htmlFor="group-search">
        <Input
          id="group-search"
          type="search"
          aria-label="Buscar prenda"
          placeholder="Nombre"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </Field>
      {matches.length > 0 ? (
        <ul className="flex flex-col border border-line">
          {matches.map((product) => (
            <li
              key={product.id}
              className="flex items-center justify-between gap-3 border-b border-line px-3 py-2 text-sm last:border-b-0"
            >
              <span className="font-medium text-ink">{product.name}</span>
              <span className="text-muted">{product.lotName}</span>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={pending}
                aria-label={`Agregar: ${product.name}`}
                onClick={() => run({ productIds: [product.id] })}
              >
                Agregar
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <Outcome state={outcome} />
    </section>
  );
}

function AllocationTable({
  product,
  values,
  onChange,
  onRemove,
  disabled,
}: {
  product: GroupProduct;
  values: Record<string, string>;
  onChange: (variantId: string, value: string) => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-ink">{product.name}</span>
          <span className="text-xs text-muted">{product.lotName}</span>
        </div>
        <button
          type="button"
          disabled={disabled}
          aria-label={`Quitar: ${product.name}`}
          onClick={onRemove}
          className="text-sm text-warn underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50"
        >
          Quitar
        </button>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead className="text-left text-[11px] uppercase tracking-[0.12em] text-muted">
          <tr>
            <th className="py-1 font-medium">Talle</th>
            <th className="py-1 text-right font-medium">Físico</th>
            <th className="py-1 text-right font-medium">Libre</th>
            <th className="py-1 text-right font-medium">Asignado</th>
            <th className="py-1 text-right font-medium">Vendido</th>
            <th className="py-1 text-right font-medium">Restante</th>
          </tr>
        </thead>
        <tbody>
          {product.sizes.map((size) => (
            <tr key={size.variantId} className="border-t border-line">
              <td className="py-1.5">{size.size}</td>
              <td className="py-1.5 text-right tabular-nums">{size.stock}</td>
              <td className="py-1.5 text-right tabular-nums">{size.free}</td>
              <td className="py-1.5">
                <Input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  aria-label={`Asignado: ${product.name}, talle ${size.size}`}
                  className="ml-auto h-8 w-20 text-right tabular-nums"
                  value={values[size.variantId] ?? ""}
                  onChange={(event) => onChange(size.variantId, event.target.value)}
                />
              </td>
              <td className="py-1.5 text-right tabular-nums">{size.sold}</td>
              <td className="py-1.5 text-right tabular-nums">
                {remaining(toNumber(values[size.variantId]), size.sold, size.stock)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Allocations({
  detail,
  actions,
}: {
  detail: GroupDetail;
  actions: Pick<GroupsViewActions, "saveAllocations" | "removeProduct">;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      detail.products.flatMap((product) =>
        product.sizes.map((size) => [size.variantId, String(size.allocated)]),
      ),
    ),
  );
  const [outcome, setOutcome] = useState<FormState | null>(null);
  const [pending, startTransition] = useTransition();

  // What the web would show once the group is on, from the quantities as typed.
  let units = 0;
  let shown = 0;
  for (const product of detail.products) {
    const left = product.sizes.reduce(
      (total, size) => total + remaining(toNumber(values[size.variantId]), size.sold, size.stock),
      0,
    );
    units += left;
    if (left > 0) shown += 1;
  }

  const save = () =>
    startTransition(async () => {
      const entries = detail.products.flatMap((product) =>
        product.sizes.map((size) => ({
          variantId: size.variantId,
          allocated: toNumber(values[size.variantId]),
        })),
      );
      setOutcome(await actions.saveAllocations(detail.id, entries));
    });

  return (
    <section aria-labelledby="group-allocations-title" className="flex flex-col gap-4">
      <h3 id="group-allocations-title" className="text-sm font-medium text-ink">
        Prendas del grupo
      </h3>
      {detail.products.length === 0 ? (
        <p className="text-sm text-muted">Todavía no agregaste prendas.</p>
      ) : (
        <>
          {detail.products.map((product) => (
            <AllocationTable
              key={product.id}
              product={product}
              values={values}
              disabled={pending}
              onChange={(variantId, value) =>
                setValues((current) => ({ ...current, [variantId]: value }))
              }
              onRemove={() =>
                startTransition(async () =>
                  setOutcome(await actions.removeProduct(detail.id, product.id)),
                )
              }
            />
          ))}
          <p className="text-sm font-medium text-ink">
            {`La web va a mostrar ${shown} prendas / ${units} unidades`}
          </p>
          <Outcome state={outcome} />
          <div>
            <Button type="button" disabled={pending} onClick={save}>
              Guardar cantidades
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

/** Side panel: group data, bulk and single add, per-size quantities and delete. */
export function GroupEditor({
  detail,
  options,
  products,
  actions,
  closeHref,
}: {
  /** The saved group, or null to create one. */
  detail: GroupDetail | null;
  options: GroupOptions;
  products: PickerProduct[];
  actions: GroupsViewActions;
  closeHref: string;
}) {
  // Quantities restart from the saved values whenever the server sends new ones.
  const signature = JSON.stringify(detail?.products ?? []);
  return (
    <div className="flex flex-col gap-6">
      <GroupForm detail={detail} action={actions.saveGroup} closeHref={closeHref} />
      {detail ? (
        <>
          <AddProducts
            groupId={detail.id}
            inGroup={new Set(detail.products.map((product) => product.id))}
            options={options}
            products={products}
            add={actions.addProducts}
          />
          <Allocations key={signature} detail={detail} actions={actions} />
          <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
            {detail.isActive ? (
              <p className="text-xs text-muted">Desactivá el grupo para poder eliminarlo.</p>
            ) : (
              <ConfirmDeleteButton
                id={detail.id}
                name={detail.name}
                noun="el grupo"
                action={actions.deleteGroup}
                redirectTo={closeHref}
                variant="outlined"
              />
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
