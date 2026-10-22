"use client";

import { useState } from "react";
import type { LookbookItem, LookbookPiece } from "../../lib/lookbook";
import { effectivePriceGs } from "../../lib/price";
import { BankPromosBlock } from "../bank-promos-block";
import { Price } from "../price";
import { useCart } from "./cart";

/** What the shopper chose for one garment: its color (a product) and its size. */
type Choice = { pieceId: string; size: string | null };

const preselectedSize = (piece: LookbookPiece | undefined) =>
  piece?.sizes.length === 1 ? (piece.sizes[0] ?? null) : null;

const sizeLabel = (size: string) => (size === "U" ? "Único" : size);

/** Shows the first photo of the chosen color in the page carousel, when that color has one. */
function showPhotoOf(pieceId: string) {
  const photo = document.querySelector<HTMLElement>(`[data-piece="${CSS.escape(pieceId)}"]`);
  photo?.parentElement?.scrollTo({ left: photo.offsetLeft, behavior: "smooth" });
}

function GarmentOptions({
  item,
  piece,
  size,
  heading: Heading,
  description,
  onColor,
  onSize,
}: {
  item: LookbookItem;
  piece: LookbookPiece;
  size: string | null;
  heading: "h2" | "h3";
  description: string | null;
  onColor: (option: LookbookPiece) => void;
  onSize: (size: string | null) => void;
}) {
  const colors = item.options.filter((option) => option.color);
  return (
    <div className="flex flex-col gap-3">
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
      {description && <p className="-mt-1 hidden text-sm text-fg-muted sm:block">{description}</p>}

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
                    onChange={() => onColor(option)}
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
        <div className="flex items-center gap-3">
          <span className="text-[11px] tracking-[2.4px] text-fg-muted uppercase">Talle</span>
          <div className="flex flex-wrap gap-2">
            {piece.sizes.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={size === option}
                aria-label={`Talle ${sizeLabel(option)} de ${item.name}`}
                // Tapping the chosen size again leaves the garment out of the order
                onClick={() => onSize(size === option ? null : option)}
                className={`inline-flex h-10 min-w-10 items-center justify-center rounded-[3px] border px-3 text-sm transition-colors ${
                  size === option
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-foreground hover:border-foreground"
                }`}
              >
                {sizeLabel(option)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The garments of a lookbook page with one "Agregar al carrito" for all of them, like a "shop the
 * look". Each garment shows name, price, color and size chips; each color is its own product, so
 * choosing one switches the photo, the sizes and the price. The button adds every garment with a
 * size chosen (a single size comes preselected; tapping it again leaves the garment out).
 */
export function AddToCart({
  items,
  set,
  description,
  link,
}: {
  items: LookbookItem[];
  /** Several garments on the page: their names are `h3` under the page title. */
  set: boolean;
  /** Shown under the name of a single garment (a set shows it under the page title). */
  description: string | null;
  link: string | null;
}) {
  const { add, open } = useCart();
  const [choices, setChoices] = useState<Choice[]>(() =>
    items.map((item) => ({
      pieceId: item.options[0]?.id ?? "",
      size: preselectedSize(item.options[0]),
    })),
  );
  const [added, setAdded] = useState(false);

  const pieceOf = (index: number) => {
    const options = items[index]?.options ?? [];
    return options.find((option) => option.id === choices[index]?.pieceId) ?? options[0];
  };

  const choose = (index: number, choice: Choice) => {
    setChoices((current) => current.map((old, i) => (i === index ? choice : old)));
    setAdded(false);
  };

  const chosen = choices.flatMap((choice, index) => {
    const piece = pieceOf(index);
    return piece && choice.size ? [{ piece, size: choice.size }] : [];
  });

  const addAll = () => {
    for (const { piece, size } of chosen) {
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
    }
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2500);
  };

  const label = added
    ? "Agregado ✓"
    : chosen.length === 0
      ? set
        ? "Elegí tus talles"
        : "Elegí tu talle"
      : set && chosen.length > 1
        ? `Agregar ${chosen.length} prendas al carrito`
        : "Agregar al carrito";

  return (
    <div className="flex flex-col gap-5">
      {items.map((item, index) => {
        const piece = pieceOf(index);
        if (!piece) return null;
        return (
          <GarmentOptions
            key={item.name}
            item={item}
            piece={piece}
            size={choices[index]?.size ?? null}
            heading={set ? "h3" : "h2"}
            description={set ? null : description}
            onColor={(option) => {
              choose(index, { pieceId: option.id, size: preselectedSize(option) });
              showPhotoOf(option.id);
            }}
            onSize={(size) => choose(index, { pieceId: piece.id, size })}
          />
        );
      })}

      <BankPromosBlock groups={items.flatMap((_, index) => pieceOf(index)?.bankPromos ?? [])} />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={addAll}
          disabled={chosen.length === 0}
          className="inline-flex min-h-12 flex-1 items-center justify-center bg-primary px-[30px] text-[15px] tracking-[1px] text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {label}
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
