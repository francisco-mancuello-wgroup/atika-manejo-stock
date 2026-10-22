"use client";

import { cn, Input } from "@atika/ui";
import { type Draft, rowRemaining, toCount } from "../lib/catalog-groups/matrix";
import { remaining } from "../lib/catalog-groups/stock";
import type { GroupProduct, GroupSize } from "../lib/queries/catalog-groups";
import { ProductThumb } from "./product-thumb";
import { table } from "./styles";

function SizeCell({
  product,
  size,
  saved,
  value,
  disabled,
  onChange,
}: {
  product: GroupProduct;
  size: GroupSize;
  saved: string | undefined;
  value: string;
  disabled: boolean;
  onChange: (variantId: string, value: string) => void;
}) {
  const allocated = toCount(value);
  const left = remaining(allocated, size.sold, size.stock);
  const soldOut = allocated > 0 && left === 0;
  const dirty = toCount(value) !== toCount(saved);
  const hint = soldOut
    ? "agotado"
    : size.sold > 0
      ? `${size.sold} vend. · ${size.free} lib.`
      : `de ${size.max}`;
  return (
    <div className="flex flex-col items-center gap-1">
      <Input
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        data-allocation=""
        disabled={disabled}
        aria-label={`Asignado: ${product.name}, talle ${size.size}`}
        className={cn(
          "h-9 w-[52px] px-1 text-center tabular-nums",
          dirty && "border-2 border-ink",
          soldOut && "border-warn bg-warnbg text-warn",
        )}
        value={value}
        onChange={(event) => onChange(size.variantId, event.target.value)}
      />
      <span className={cn("whitespace-nowrap text-[11px]", soldOut ? "text-warn" : "text-muted")}>
        {hint}
      </span>
    </div>
  );
}

/** Products by size: one editable quantity per size, the web total per row and a remove button. */
export function GroupMatrix({
  products,
  sizes,
  saved,
  draft,
  disabled,
  onChange,
  onRemove,
}: {
  products: readonly GroupProduct[];
  sizes: readonly string[];
  saved: Draft;
  draft: Draft;
  disabled: boolean;
  onChange: (variantId: string, value: string) => void;
  onRemove: (product: GroupProduct) => void;
}) {
  // Enter walks the quantity inputs in reading order (row by row, size by size).
  const next = (event: React.KeyboardEvent<HTMLTableElement>) => {
    if (event.key !== "Enter" || !(event.target instanceof HTMLInputElement)) return;
    event.preventDefault();
    const inputs = [
      ...event.currentTarget.querySelectorAll<HTMLInputElement>("input[data-allocation]"),
    ];
    const target = inputs[inputs.indexOf(event.target) + 1];
    target?.focus();
    target?.select();
  };

  return (
    <div className={table.wrapper}>
      <table className={table.root} onKeyDown={next}>
        <thead className={table.head}>
          <tr>
            <th className={table.th}>PRENDA</th>
            {sizes.map((size) => (
              <th key={size} className={cn(table.th, "text-center")}>
                {size}
              </th>
            ))}
            <th className={cn(table.th, "text-right")}>WEB</th>
            <th className={table.th} />
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className={table.row}>
              <td className={table.td}>
                <div className="flex items-center gap-3">
                  <ProductThumb src={product.imageUrl} name={product.name} />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{product.name}</span>
                    <span className="truncate text-xs text-muted">{product.lotName}</span>
                  </div>
                </div>
              </td>
              {sizes.map((label) => {
                const size = product.sizes.find((candidate) => candidate.size === label);
                return (
                  <td key={label} className={cn(table.td, "px-2 text-center")}>
                    {size ? (
                      <SizeCell
                        product={product}
                        size={size}
                        saved={saved[size.variantId]}
                        value={draft[size.variantId] ?? ""}
                        disabled={disabled}
                        onChange={onChange}
                      />
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                );
              })}
              <td className={cn(table.td, table.num, "font-semibold")}>
                {rowRemaining(product, draft)}
              </td>
              <td className={cn(table.td, "text-right")}>
                <button
                  type="button"
                  disabled={disabled}
                  aria-label={`Quitar ${product.name}`}
                  onClick={() => onRemove(product)}
                  className="px-2 text-lg leading-none text-muted hover:text-warn focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
