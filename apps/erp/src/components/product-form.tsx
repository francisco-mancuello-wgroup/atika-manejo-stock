"use client";

import { CATALOG_CATEGORIES } from "@atika/db/categories";
import type { LotPricingParams } from "@atika/pricing";
import { Button, Input } from "@atika/ui";
import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { type FormState, IDLE } from "../lib/action-state";
import { formatGs, formatUsd } from "../lib/format";
import { previewPrice } from "../lib/products/preview";
import { shrinkInputPhotos, tooBigToUpload } from "../lib/products/shrink-photos";
import { SIZE_ORDER } from "../lib/sizes";
import { FocalPointPicker, type FocusablePhoto } from "./focal-point-picker";
import { Field, FormMessage, Select } from "./form-controls";
import { table } from "./styles";

type Action = (previous: FormState, formData: FormData) => Promise<FormState>;

export interface LotContext {
  id: string;
  name: string;
  params: LotPricingParams;
  /** Units bought by the other products of the lot (the product being edited excluded). */
  otherUnits: number;
}

interface SizeRow {
  size: string;
  unitsBought: string;
  stock: string;
}

export interface ProductFormInitial {
  name: string;
  code: string;
  brand: string;
  color: string;
  category: string;
  description: string;
  originalValueUsd: string;
  sizes: SizeRow[];
}

export const EMPTY_PRODUCT: ProductFormInitial = {
  name: "",
  code: "",
  brand: "",
  color: "",
  category: "",
  description: "",
  originalValueUsd: "",
  sizes: [{ size: "", unitsBought: "1", stock: "1" }],
};

const TEXT_FIELDS = [
  { name: "name", label: "Nombre" },
  { name: "code", label: "Código" },
  { name: "brand", label: "Marca" },
  { name: "color", label: "Color" },
] as const;

const toNumber = (text: string) =>
  text.trim() === "" ? Number.NaN : Number(text.replace(",", "."));
const toUnits = (text: string) => {
  const value = Number(text);
  return Number.isInteger(value) && value > 0 ? value : 0;
};

/** Edit or create one product: fields, sizes, photos and the live cost/price from the lot formula. */
export function ProductForm({
  mode,
  lots,
  lotId,
  initial = EMPTY_PRODUCT,
  photos = [],
  action,
}: {
  mode: "edit" | "new";
  lots: LotContext[];
  /** The product's lot (edit mode). */
  lotId?: string;
  initial?: ProductFormInitial;
  photos?: FocusablePhoto[];
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const values = state.status === "error" ? (state.values ?? {}) : {};
  const [chosenLot, setChosenLot] = useState(values.lotId ?? lotId ?? "");
  const [original, setOriginal] = useState(initial.originalValueUsd);
  const [nextKey, setNextKey] = useState(initial.sizes.length);
  const [rows, setRows] = useState(initial.sizes.map((row, key) => ({ ...row, key })));
  const [fileNames, setFileNames] = useState<{ id: string; name: string }[]>([]);
  // Photos are shrunk in the browser before upload; saving waits until they are ready
  const [preparing, setPreparing] = useState(false);
  const [uploadError, setUploadError] = useState<string | undefined>();
  const pick = useRef(0);

  const lot = lots.find((candidate) => candidate.id === chosenLot);
  const preview = lot
    ? previewPrice({
        params: lot.params,
        otherUnits: lot.otherUnits,
        units: rows.reduce((sum, row) => sum + toUnits(row.unitsBought), 0),
        originalValueUsd: toNumber(original),
      })
    : null;

  const text = (name: keyof ProductFormInitial) => ({
    id: name,
    name,
    defaultValue: values[name] ?? (initial[name] as string),
    "aria-invalid": errors[name] ? (true as const) : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  const updateRow = (key: number, change: Partial<SizeRow>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...change } : row)));

  const rowLabel = (row: SizeRow, index: number) =>
    row.size ? `talle ${row.size}` : `fila ${index + 1}`;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <section className="grid grid-cols-1 gap-4 border border-line bg-surface p-5 md:grid-cols-2">
        {mode === "new" ? (
          <Field label="Lote" htmlFor="lotId" error={errors.lotId}>
            <Select
              id="lotId"
              name="lotId"
              value={chosenLot}
              onChange={(event) => setChosenLot(event.target.value)}
              aria-invalid={errors.lotId ? true : undefined}
              aria-describedby={errors.lotId ? "lotId-error" : undefined}
            >
              <option value="">Elegí un lote</option>
              {lots.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink">Lote</span>
            <span className="flex h-10 items-center text-sm text-ink">{lot?.name}</span>
          </div>
        )}
        {TEXT_FIELDS.map((field) => (
          <Field
            key={field.name}
            label={field.label}
            htmlFor={field.name}
            error={errors[field.name]}
          >
            <Input {...text(field.name)} />
          </Field>
        ))}
        <Field label="Categoría" htmlFor="category" error={errors.category}>
          <Select id="category" name="category" defaultValue={values.category ?? initial.category}>
            <option value="">Sin categoría</option>
            {CATALOG_CATEGORIES.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="md:col-span-2">
          <Field label="Descripción" htmlFor="description" error={errors.description}>
            <textarea
              {...text("description")}
              rows={3}
              className="w-full rounded-none border border-line bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink"
            />
          </Field>
        </div>
      </section>

      <section className="grid grid-cols-1 items-end gap-4 border border-line bg-surface p-5 md:grid-cols-3">
        <Field
          label="Valor original US$"
          htmlFor="originalValueUsd"
          error={errors.originalValueUsd}
        >
          <Input
            id="originalValueUsd"
            name="originalValueUsd"
            inputMode="decimal"
            value={original}
            onChange={(event) => setOriginal(event.target.value)}
            aria-invalid={errors.originalValueUsd ? true : undefined}
            aria-describedby={errors.originalValueUsd ? "originalValueUsd-error" : undefined}
          />
        </Field>
        <Field label="Costo u. (US$)" htmlFor="unitCost">
          <Input
            id="unitCost"
            readOnly
            tabIndex={-1}
            value={preview ? formatUsd(preview.unitCostUsd) : "–"}
            className="bg-subtle tabular-nums"
          />
        </Field>
        <Field label="Precio (₲)" htmlFor="price">
          <Input
            id="price"
            readOnly
            tabIndex={-1}
            value={preview ? formatGs(preview.priceGs) : "–"}
            className="bg-subtle tabular-nums"
          />
        </Field>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl text-ink">Talles</h2>
        <div className={table.wrapper}>
          <table className={table.root}>
            <thead className={table.head}>
              <tr>
                <th className={table.th}>Talle</th>
                <th className={table.th}>Unidades compradas</th>
                <th className={table.th}>Stock</th>
                <th className={table.th}>
                  <span className="sr-only">Quitar</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.key} className={table.row}>
                  <td className={table.td}>
                    <Select
                      name={`sizes.${index}.size`}
                      aria-label={`Talle fila ${index + 1}`}
                      value={row.size}
                      onChange={(event) => updateRow(row.key, { size: event.target.value })}
                      className="w-28"
                    >
                      <option value="">Talle</option>
                      {SIZE_ORDER.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </Select>
                    <RowError message={errors[`sizes.${index}.size`]} />
                  </td>
                  <td className={table.td}>
                    <Input
                      name={`sizes.${index}.unitsBought`}
                      aria-label={`Unidades compradas ${rowLabel(row, index)}`}
                      inputMode="numeric"
                      value={row.unitsBought}
                      onChange={(event) => updateRow(row.key, { unitsBought: event.target.value })}
                      className="w-28"
                    />
                    <RowError message={errors[`sizes.${index}.unitsBought`]} />
                  </td>
                  <td className={table.td}>
                    <Input
                      name={`sizes.${index}.stock`}
                      aria-label={`Stock ${rowLabel(row, index)}`}
                      inputMode="numeric"
                      value={row.stock}
                      onChange={(event) => updateRow(row.key, { stock: event.target.value })}
                      className="w-28"
                    />
                    <RowError message={errors[`sizes.${index}.stock`]} />
                  </td>
                  <td className={`${table.td} text-right`}>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={rows.length === 1}
                      aria-label={`Quitar ${rowLabel(row, index)}`}
                      onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                    >
                      Quitar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {errors.sizes ? (
          <p role="alert" className="text-xs text-warn">
            {errors.sizes}
          </p>
        ) : null}
        <div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setRows((current) => [
                ...current,
                { key: nextKey, size: "", unitsBought: "1", stock: "1" },
              ]);
              setNextKey(nextKey + 1);
            }}
          >
            Agregar talle
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl text-ink">Fotos</h2>
        {photos.length > 0 ? (
          <p className="text-xs text-muted">
            Tocá la foto para elegir qué parte se ve siempre en la web.
          </p>
        ) : null}
        {photos.length > 0 ? (
          <ul key={photos.map((photo) => photo.id).join()} className="flex flex-wrap gap-4">
            {photos.map((photo, index) => (
              <li
                // A new saved point or zoom remounts the picker so it shows what is stored
                key={`${photo.id}:${photo.focusX ?? 50},${photo.focusY ?? 50}:${photo.fit ?? "auto"}`}
                className="flex w-48 flex-col gap-2 border border-line bg-surface p-2"
              >
                <FocalPointPicker photo={photo} index={index} />
                <label className="flex items-center gap-2 text-xs">
                  <input type="radio" name="cover" value={photo.id} defaultChecked={index === 0} />
                  Portada
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" name="removePhoto" value={photo.id} />
                  Quitar foto
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Este producto no tiene fotos.</p>
        )}
        <Field
          label="Agregar fotos"
          htmlFor="photos"
          error={uploadError ?? errors.photos}
          hint="JPG, PNG o WebP. Se achican solas antes de subir."
        >
          <input
            id="photos"
            name="photos"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={async (event) => {
              const input = event.target;
              setFileNames(
                Array.from(input.files ?? [], (file, i) => ({ id: `new:${i}`, name: file.name })),
              );
              const current = ++pick.current;
              setPreparing(true);
              const files = await shrinkInputPhotos(input, () => current === pick.current);
              if (current !== pick.current) return;
              setUploadError(
                tooBigToUpload(files.map((file) => file.size))
                  ? "Las fotos pesan demasiado juntas: subí menos por vez."
                  : undefined,
              );
              setPreparing(false);
            }}
            className="text-sm"
          />
        </Field>
        {fileNames.length > 0 ? (
          <ul className="flex flex-col gap-1 text-sm">
            {fileNames.map((file, index) => (
              <li key={file.id} className="flex items-center gap-3">
                <span>{file.name}</span>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="radio"
                    name="cover"
                    value={file.id}
                    defaultChecked={photos.length === 0 && index === 0}
                  />
                  Portada
                </label>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <FormMessage state={state} />
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending || preparing || uploadError !== undefined}>
          {pending ? "Guardando…" : preparing ? "Preparando fotos…" : "Guardar"}
        </Button>
        <Link href="/inventario" className="text-sm text-muted underline-offset-4 hover:underline">
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function RowError({ message }: { message?: string }) {
  return message ? <span className="mt-1 block text-xs text-warn">{message}</span> : null;
}
