"use client";

import { useState } from "react";
import type { PieceColor } from "../../lib/colors";
import { useCart } from "./cart";

/**
 * Color, size chips and "Agregar al carrito" of a lookbook piece, in the order shoppers expect
 * from fashion apps. A single size is preselected; the button stays disabled until a size is
 * chosen. `relative` on each chip keeps the hidden radio inside it, so focusing it never scrolls
 * the page somewhere else.
 */
export function AddToCart({
  id,
  name,
  priceGs,
  discountPercent = null,
  sizes,
  color,
  link,
}: {
  id: string;
  name: string;
  /** What the customer pays (already discounted); null when prices are hidden. */
  priceGs: number | null;
  /** Percent off included in `priceGs`. */
  discountPercent?: number | null;
  sizes: string[];
  color: PieceColor | null;
  link: string | null;
}) {
  const { add, open } = useCart();
  const single = sizes.length === 1;
  const oneSize = single && sizes[0] === "U";
  const [size, setSize] = useState<string | null>(single ? (sizes[0] ?? null) : null);
  const [added, setAdded] = useState(false);

  const addItem = () => {
    if (!size) return;
    add({
      id,
      name,
      size,
      color: color?.label ?? null,
      priceGs,
      discountPercent,
      link,
      quantity: 1,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2500);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        {color && (
          <p className="flex items-center gap-2 text-sm text-fg-muted">
            {color.hex && (
              <span
                aria-hidden="true"
                className="size-4 rounded-full border border-foreground/15"
                style={{ backgroundColor: color.hex }}
              />
            )}
            <span className="sr-only">Color: </span>
            {color.label}
          </p>
        )}
        <fieldset className="flex items-center gap-3">
          <legend className="float-left mr-3 text-[11px] tracking-[2.4px] text-fg-muted uppercase">
            {oneSize ? "Talle único" : "Talle"}
          </legend>
          {!oneSize && (
            <div className="flex flex-wrap gap-2">
              {sizes.map((option) => (
                <label
                  key={option}
                  className={`relative inline-flex h-10 min-w-10 cursor-pointer items-center justify-center rounded-[3px] border px-3 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-foreground ${
                    size === option
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-foreground hover:border-foreground"
                  }`}
                >
                  <input
                    type="radio"
                    name={`talle-${id}`}
                    value={option}
                    checked={size === option}
                    onChange={() => setSize(option)}
                    className="sr-only"
                  />
                  {option}
                </label>
              ))}
            </div>
          )}
        </fieldset>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={addItem}
          disabled={!size}
          className="inline-flex min-h-12 flex-1 items-center justify-center bg-primary px-[30px] text-[15px] tracking-[1px] text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {added ? "Agregado ✓" : size ? "Agregar al carrito" : "Elegí tu talle"}
        </button>
        {added && (
          <button
            type="button"
            onClick={open}
            className="inline-flex min-h-12 items-center justify-center border border-foreground px-5 text-[15px] tracking-[1px] transition-colors hover:bg-hover"
          >
            Ver carrito
          </button>
        )}
      </div>
    </div>
  );
}
