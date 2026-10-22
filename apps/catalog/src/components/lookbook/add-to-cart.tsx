"use client";

import { useState } from "react";
import type { LookbookItem, LookbookPiece } from "../../lib/lookbook";
import { effectivePriceGs } from "../../lib/price";
import { Price } from "../price";
import { useCart } from "./cart";

const preselectedSize = (piece: LookbookPiece | undefined) =>
  piece?.sizes.length === 1 ? (piece.sizes[0] ?? null) : null;

/** Shows the first photo of the chosen color in the page carousel, when that color has one. */
function showPhotoOf(pieceId: string) {
  const photo = document.querySelector<HTMLElement>(`[data-piece="${CSS.escape(pieceId)}"]`);
  photo?.parentElement?.scrollTo({ left: photo.offsetLeft, behavior: "smooth" });
}

/**
 * Name, price, color, size chips and "Agregar al carrito" of one garment, in the order shoppers
 * expect from fashion apps. Each color is its own product, so choosing one switches the photo,
 * the sizes and the price. A single size is preselected; the button stays disabled until a size
 * is chosen. `relative` on each chip keeps the hidden radio inside it, so focusing it never
 * scrolls the page somewhere else.
 */
export function AddToCart({
  item,
  heading: Heading,
  description = null,
  link,
}: {
  item: LookbookItem;
  /** `h2` when the garment is the whole page, `h3` inside a set. */
  heading: "h2" | "h3";
  /** Shown under the name of a single garment (a set shows it under the page title). */
  description?: string | null;
  link: string | null;
}) {
  const { add, open } = useCart();
  const [pieceId, setPieceId] = useState(item.options[0]?.id);
  const piece = item.options.find((option) => option.id === pieceId) ?? item.options[0];
  const [size, setSize] = useState<string | null>(preselectedSize(piece));
  const [added, setAdded] = useState(false);
  if (!piece) return null;

  const sizes = piece.sizes;
  const oneSize = sizes.length === 1 && sizes[0] === "U";
  const colors = item.options.filter((option) => option.color);

  const chooseColor = (option: LookbookPiece) => {
    setPieceId(option.id);
    setSize(preselectedSize(option));
    setAdded(false);
    showPhotoOf(option.id);
  };

  const addItem = () => {
    if (!size) return;
    add({
      id: piece.id,
      name: piece.name,
      size,
      color: piece.color?.label ?? null,
      priceGs: effectivePriceGs(piece),
      discountPercent: piece.discountPercent,
      link,
      quantity: 1,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2500);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4">
        <Heading
          className={
            Heading === "h2"
              ? "font-heading text-[28px] leading-tight sm:text-[34px] landscape:lg:text-[44px]"
              : "font-heading text-xl"
          }
        >
          {item.name}
        </Heading>
        <p className="shrink-0 text-base tracking-[1px] whitespace-nowrap sm:text-lg">
          <Price {...piece} />
        </p>
      </div>
      {description && <p className="-mt-2 hidden text-sm text-fg-muted sm:block">{description}</p>}

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        {colors.length > 1 ? (
          <fieldset className="flex items-center gap-3">
            <legend className="float-left mr-3 text-sm text-fg-muted">
              <span className="sr-only">Color: </span>
              {piece.color?.label}
            </legend>
            <div className="flex flex-wrap gap-2">
              {colors.map((option) => (
                <label
                  key={option.id}
                  title={option.color?.label}
                  className={`relative inline-flex size-9 cursor-pointer items-center justify-center rounded-full border transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-foreground ${
                    option.id === piece.id
                      ? "border-foreground"
                      : "border-transparent hover:border-border"
                  }`}
                >
                  <input
                    type="radio"
                    name={`color-${item.options[0]?.id}`}
                    value={option.id}
                    checked={option.id === piece.id}
                    onChange={() => chooseColor(option)}
                    className="sr-only"
                  />
                  <span className="sr-only">{option.color?.label}</span>
                  <span
                    aria-hidden="true"
                    className="size-6 rounded-full border border-foreground/15"
                    style={{ backgroundColor: option.color?.hex ?? undefined }}
                  />
                </label>
              ))}
            </div>
          </fieldset>
        ) : (
          piece.color && (
            <p className="flex items-center gap-2 text-sm text-fg-muted">
              {piece.color.hex && (
                <span
                  aria-hidden="true"
                  className="size-4 rounded-full border border-foreground/15"
                  style={{ backgroundColor: piece.color.hex }}
                />
              )}
              <span className="sr-only">Color: </span>
              {piece.color.label}
            </p>
          )
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
                    name={`talle-${item.options[0]?.id}`}
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
