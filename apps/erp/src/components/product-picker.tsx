"use client";

import { CATALOG_CATEGORIES } from "@atika/db/categories";
import { Input } from "@atika/ui";
import { useMemo, useState } from "react";
import { filterPickerProducts, NO_CATEGORY } from "../lib/discounts/format";
import { formatGs } from "../lib/format";
import type { PickerProduct } from "../lib/queries/discounts";
import { Field, Select } from "./form-controls";
import { ProductThumb } from "./product-thumb";

/** Checklist of products with search and lot/category filters; selection survives filtering. */
export function ProductPicker({
  products,
  selectedIds,
  onChange,
  error,
  legend = "Productos del descuento",
}: {
  products: PickerProduct[];
  selectedIds: readonly string[];
  onChange: (ids: string[]) => void;
  error?: string;
  legend?: string;
}) {
  const [filters, setFilters] = useState({ query: "", lotId: "", category: "" });
  const filtered = useMemo(() => filterPickerProducts(products, filters), [products, filters]);
  const lots = useMemo(() => {
    const byId = new Map(products.map((product) => [product.lotId, product.lotName]));
    return [...byId].sort((a, b) => a[1].localeCompare(b[1], "es"));
  }, [products]);

  const selected = new Set(selectedIds);
  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  const toggle = (id: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    onChange([...next]);
  };

  const toggleFiltered = (checked: boolean) => {
    const next = new Set(selected);
    for (const product of filtered) {
      if (checked) next.add(product.id);
      else next.delete(product.id);
    }
    onChange([...next]);
  };

  return (
    <fieldset className="flex flex-col gap-4 border border-line bg-surface p-5">
      <legend className="px-2 text-xs font-medium text-ink">{legend}</legend>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field label="Buscar producto" htmlFor="picker-query">
          <Input
            id="picker-query"
            type="search"
            placeholder="Nombre"
            value={filters.query}
            onChange={(event) => setFilters({ ...filters, query: event.target.value })}
          />
        </Field>
        <Field label="Lote" htmlFor="picker-lot">
          <Select
            id="picker-lot"
            value={filters.lotId}
            onChange={(event) => setFilters({ ...filters, lotId: event.target.value })}
          >
            <option value="">Todos los lotes</option>
            {lots.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Categoría" htmlFor="picker-category">
          <Select
            id="picker-category"
            value={filters.category}
            onChange={(event) => setFilters({ ...filters, category: event.target.value })}
          >
            <option value="">Todas las categorías</option>
            {CATALOG_CATEGORIES.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.label}
              </option>
            ))}
            <option value={NO_CATEGORY}>Sin categoría</option>
          </Select>
        </Field>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={allFilteredSelected}
            disabled={filtered.length === 0}
            onChange={(event) => toggleFiltered(event.target.checked)}
          />
          Seleccionar todos los filtrados
        </label>
        <span className="text-sm text-muted">
          {`${selectedIds.length} ${selectedIds.length === 1 ? "seleccionado" : "seleccionados"}`}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted">No hay productos que coincidan.</p>
      ) : (
        <ul className="flex max-h-[28rem] flex-col overflow-y-auto">
          {filtered.map((product) => (
            <li key={product.id} className="border-b border-line last:border-b-0">
              <label className="flex cursor-pointer items-center gap-3 px-1 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.has(product.id)}
                  onChange={(event) => toggle(product.id, event.target.checked)}
                />
                <ProductThumb src={product.imageUrl} name="" />
                <span className="flex-1 font-medium text-ink">{product.name}</span>
                <span className="text-muted">{product.lotName}</span>
                <span className="w-28 text-right tabular-nums text-ink">
                  {formatGs(product.priceGs)}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
      {error ? (
        <p role="alert" className="text-xs text-warn">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
