"use client";

import { Input } from "@atika/ui";
import { useId, useState } from "react";
import type { SellableProduct } from "../lib/queries/sales";
import { findBySizeBarcode, matchesProduct } from "../lib/sales/product-search";

/** "Milonga · Lote Otoño": the context that tells apart products sharing a name. */
function secondaryText(product: SellableProduct): string {
  return [product.catalogName, product.brand, product.lotName].filter(Boolean).join(" · ");
}

/**
 * Searchable product picker (ARIA combobox with a listbox). Typing filters the products; typing or
 * scanning an exact size barcode selects that product and size straight away. Enter never reaches
 * the surrounding form, because USB scanners press it after the code.
 */
export function ProductPicker({
  id,
  products,
  selected,
  invalid,
  onSelect,
  onClear,
}: {
  id: string;
  products: SellableProduct[];
  selected: SellableProduct | undefined;
  invalid?: boolean;
  /** `size` is only set when a size barcode picked the product. */
  onSelect: (product: SellableProduct, size?: string) => void;
  onClear: () => void;
}) {
  const listId = useId();
  // null: show the selected product's label; a string: the user is typing.
  const [query, setQuery] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const text = query ?? selected?.label ?? "";
  const results = products.filter((product) => matchesProduct(product, query ?? ""));
  const optionId = (index: number) => `${listId}-${index}`;

  function choose(product: SellableProduct, size?: string) {
    setQuery(null);
    setOpen(false);
    setActive(-1);
    onSelect(product, size);
  }

  function handleChange(value: string) {
    const scanned = findBySizeBarcode(products, value);
    if (scanned) {
      choose(scanned.product, scanned.size);
      return;
    }
    if (selected) onClear();
    setQuery(value);
    setOpen(true);
    setActive(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      const target = open
        ? (results[active] ?? (results.length === 1 ? results[0] : undefined))
        : undefined;
      if (target) choose(target);
    } else if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    }
  }

  const showList = open;
  return (
    <div className="relative">
      <Input
        id={id}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
        aria-invalid={invalid ? true : undefined}
        autoComplete="off"
        placeholder="Buscá por nombre, color, código o escaneá la etiqueta"
        value={text}
        onChange={(event) => handleChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      />
      {showList ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Productos"
          className="absolute z-10 mt-1 max-h-72 w-full overflow-auto border border-line bg-surface shadow-sm"
        >
          {results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted">Sin resultados</div>
          ) : (
            results.map((product, index) => (
              // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard selection happens on the combobox input via aria-activedescendant.
              <div
                key={product.id}
                id={optionId(index)}
                role="option"
                aria-selected={index === active}
                tabIndex={-1}
                className={`cursor-pointer px-3 py-2 text-sm text-ink ${index === active ? "bg-subtle" : ""}`}
                // Keep focus in the input so the blur handler does not close the list before the click.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(product)}
              >
                <span className="block">{product.label}</span>
                <span className="block text-xs text-muted">{secondaryText(product)}</span>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
