"use client";

import { Button, Input } from "@atika/ui";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { type FormState, IDLE } from "../lib/action-state";
import { CATALOG_OPTIONS } from "../lib/catalog/schema";
import type { CatalogProduct } from "../lib/queries/catalog";
import { Field, FormMessage, Select } from "./form-controls";

type Action = (previous: FormState, formData: FormData) => Promise<FormState>;

/** Per-product lookbook placement. */
export function LookbookForm({
  product,
  action,
  onSaved,
}: {
  product: CatalogProduct;
  action: Action;
  onSaved?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  useEffect(() => {
    if (state.status === "success") onSaved?.();
  }, [state, onSaved]);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const values = state.status === "error" ? (state.values ?? {}) : {};
  const id = (name: string) => `${name}-${product.id}`;
  const initial = {
    catalog: product.catalog ?? "",
    catalogOrder: product.catalogOrder?.toString() ?? "",
    catalogSection: product.catalogSection ?? "",
    catalogName: product.catalogName ?? "",
  };
  const field = (name: keyof typeof initial) => ({
    id: id(name),
    name,
    defaultValue: values[name] ?? initial[name],
    "aria-invalid": errors[name] ? (true as const) : undefined,
    "aria-describedby": errors[name] ? `${id(name)}-error` : undefined,
  });

  return (
    <form action={formAction} className="flex w-full flex-col gap-2">
      <input type="hidden" name="productId" value={product.id} />
      <div className="grid grid-cols-[1fr_5rem_1fr] gap-2">
        <Field label="Catálogo" htmlFor={id("catalog")} error={errors.catalog}>
          <Select className="h-8" {...field("catalog")}>
            <option value="">Fuera del lookbook</option>
            {CATALOG_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Página" htmlFor={id("catalogOrder")} error={errors.catalogOrder}>
          <Input className="h-8" inputMode="numeric" {...field("catalogOrder")} />
        </Field>
        <Field label="Sección" htmlFor={id("catalogSection")} error={errors.catalogSection}>
          <Input className="h-8" placeholder="Vestidos, Aros…" {...field("catalogSection")} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          name="inPink"
          defaultChecked={state.status === "error" ? values.inPink === "on" : product.inPink}
          className="size-4"
        />
        Incluir en Pink (la selección de la portada)
      </label>
      <div className="grid grid-cols-[1fr_auto] items-end gap-2">
        <Field label="Nombre en el lookbook" htmlFor={id("catalogName")} error={errors.catalogName}>
          <Input className="h-8" placeholder={product.name} {...field("catalogName")} />
        </Field>
        <Button
          type="submit"
          variant="secondary"
          disabled={pending}
          aria-label={`Guardar lookbook: ${product.name}`}
          className="h-8"
        >
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

function placementSummary(product: CatalogProduct): string {
  const catalog = CATALOG_OPTIONS.find((option) => option.value === product.catalog);
  if (!catalog) return "Sin lookbook";
  const placement =
    product.catalogOrder != null ? `${catalog.label} · p. ${product.catalogOrder}` : catalog.label;
  return product.inPink ? `${placement} · Pink` : placement;
}

/** Compact button showing the placement; opens the lookbook form in a modal. */
export function LookbookButton({ product, action }: { product: CatalogProduct; action: Action }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("select, input")?.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Lookbook: ${product.name}`}
        onClick={() => setOpen(true)}
        className="whitespace-nowrap border border-line bg-surface px-2.5 py-1 text-xs text-ink hover:border-ink"
      >
        {placementSummary(product)}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onKeyDown={(event) => {
              if (event.key === "Escape") close();
            }}
            className="flex w-full max-w-xl flex-col gap-4 border border-line bg-bg p-6 shadow-lg"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id={titleId} className="font-display text-2xl text-ink">
                Lookbook · {product.name}
              </h2>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={close}
                className="px-2 text-xl leading-none text-muted hover:text-ink"
              >
                ×
              </button>
            </div>
            <LookbookForm product={product} action={action} onSaved={close} />
          </div>
        </div>
      ) : null}
    </>
  );
}
