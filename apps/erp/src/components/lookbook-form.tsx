"use client";

import { Button, Input } from "@atika/ui";
import { useActionState } from "react";
import { type FormState, IDLE } from "../lib/action-state";
import { CATALOG_OPTIONS } from "../lib/catalog/schema";
import type { CatalogProduct } from "../lib/queries/catalog";
import { Field, FormMessage, Select } from "./form-controls";

type Action = (previous: FormState, formData: FormData) => Promise<FormState>;

/** Per-product lookbook placement. */
export function LookbookForm({ product, action }: { product: CatalogProduct; action: Action }) {
  const [state, formAction, pending] = useActionState(action, IDLE);
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
    <form action={formAction} className="flex min-w-[28rem] flex-col gap-2">
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
