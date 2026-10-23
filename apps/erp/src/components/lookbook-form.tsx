"use client";

import { Button, Input } from "@atika/ui";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { type FormState, IDLE } from "../lib/action-state";
import type { CatalogProduct } from "../lib/queries/catalog";
import { Field, FormMessage } from "./form-controls";

type Action = (previous: FormState, formData: FormData) => Promise<FormState>;

/** Per-product lookbook placement: the page inside its brand's catalog and its section. */
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
      <div className="grid grid-cols-[5rem_1fr] gap-2">
        <Field label="Página" htmlFor={id("catalogOrder")} error={errors.catalogOrder}>
          <Input className="h-8" inputMode="numeric" {...field("catalogOrder")} />
        </Field>
        <Field label="Sección" htmlFor={id("catalogSection")} error={errors.catalogSection}>
          <Input className="h-8" placeholder="Vestidos, Aros…" {...field("catalogSection")} />
        </Field>
      </div>
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
  if (product.catalogOrder == null) return "Sin página";
  const section = product.catalogSection?.trim();
  return section ? `Página ${product.catalogOrder} · ${section}` : `Página ${product.catalogOrder}`;
}

/** Compact button showing the placement; opens the lookbook form in a modal. */
export function LookbookButton({ product, action }: { product: CatalogProduct; action: Action }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("input:not([type=hidden])")?.focus();
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
