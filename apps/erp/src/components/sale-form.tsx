"use client";

import { Button, Input } from "@atika/ui";
import { useActionState, useState } from "react";
import { type FormState, IDLE } from "../lib/action-state";
import { formatGs } from "../lib/format";
import type { SellableProduct } from "../lib/queries/sales";
import { Field, FormMessage, Select } from "./form-controls";
import { ProductPicker } from "./sale-product-picker";

type Action = (previous: FormState, formData: FormData) => Promise<FormState>;

/** "Precio de lista: ₲ 400.000 (-20 %), antes ₲ 500.000" when a discount applies. */
function priceHint(product: SellableProduct): string {
  if (product.discountPercent === null || product.discountedPriceGs === null) {
    return `Precio de lista: ${formatGs(product.priceGs)}`;
  }
  return `Precio de lista: ${formatGs(product.discountedPriceGs)} (-${product.discountPercent} %), antes ${formatGs(product.priceGs)}`;
}

export function SaleForm({
  products,
  today,
  action,
}: {
  products: SellableProduct[];
  today: string;
  action: Action;
}) {
  const [productId, setProductId] = useState("");
  const [size, setSize] = useState("");
  const [chargedGs, setChargedGs] = useState("");

  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (previous, formData) => {
      const next = await action(previous, formData);
      // A recorded sale changes stock: start the next one from a clean selection.
      if (next.status === "success") {
        setProductId("");
        setSize("");
        setChargedGs("");
      } else if (next.status === "error" && next.values?.chargedGs !== undefined) {
        setChargedGs(next.values.chargedGs);
      }
      return next;
    },
    IDLE,
  );

  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const values = state.status === "error" ? (state.values ?? {}) : {};
  const product = products.find((candidate) => candidate.id === productId);
  const sizeStock = product?.sizes.find((candidate) => candidate.size === size)?.stock;

  return (
    <form action={formAction} className="flex flex-col gap-4 border border-line bg-surface p-5">
      <h2 className="font-display text-2xl text-ink">Registrar venta</h2>

      <Field label="Producto" htmlFor="productSearch" error={errors.productId}>
        <ProductPicker
          id="productSearch"
          products={products}
          selected={product}
          invalid={Boolean(errors.productId)}
          onSelect={(chosen, chosenSize) => {
            setProductId(chosen.id);
            setSize(chosenSize ?? "");
            setChargedGs(String(chosen.discountedPriceGs ?? chosen.priceGs));
          }}
          onClear={() => {
            setProductId("");
            setSize("");
            setChargedGs("");
          }}
        />
        <input type="hidden" name="productId" value={productId} />
      </Field>

      <Field label="Talle" htmlFor="size" error={errors.size}>
        <Select
          id="size"
          name="size"
          required
          disabled={!product}
          value={size}
          onChange={(event) => setSize(event.target.value)}
        >
          <option value="">Elegí un talle</option>
          {product?.sizes.map((candidate) => (
            <option key={candidate.size} value={candidate.size}>
              {`${candidate.size} (${candidate.stock} en stock)`}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Cantidad"
        htmlFor="quantity"
        error={errors.quantity}
        hint={product ? priceHint(product) : undefined}
      >
        <Input
          id="quantity"
          name="quantity"
          type="number"
          min={1}
          max={sizeStock}
          step={1}
          required
          defaultValue={values.quantity ?? 1}
          aria-invalid={errors.quantity ? true : undefined}
        />
      </Field>

      <Field label="Fecha" htmlFor="soldAt" error={errors.soldAt}>
        <Input
          id="soldAt"
          name="soldAt"
          type="date"
          required
          defaultValue={values.soldAt ?? today}
          aria-invalid={errors.soldAt ? true : undefined}
        />
      </Field>

      <Field
        label="Precio cobrado por unidad (₲)"
        htmlFor="chargedGs"
        error={errors.chargedGs}
        hint="Precargado con el precio de lista. Cambialo si cobraste otro."
      >
        <Input
          id="chargedGs"
          name="chargedGs"
          type="number"
          min={0}
          step={1}
          value={chargedGs}
          onChange={(event) => setChargedGs(event.target.value)}
          aria-invalid={errors.chargedGs ? true : undefined}
        />
      </Field>

      <Field label="Cliente" htmlFor="customer" error={errors.customer}>
        <Input id="customer" name="customer" defaultValue={values.customer ?? ""} />
      </Field>

      <Field label="Notas" htmlFor="notes" error={errors.notes}>
        <Input id="notes" name="notes" defaultValue={values.notes ?? ""} />
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? "Registrando…" : "Registrar venta"}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
