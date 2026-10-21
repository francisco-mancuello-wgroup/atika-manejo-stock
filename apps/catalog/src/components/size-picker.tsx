"use client";

import { cn } from "@atika/ui";
import { useId, useRef, useState } from "react";
import type { CatalogSize } from "../lib/catalog-view";
import { formatGs } from "../lib/format";
import { buildPieceWhatsappUrl } from "../lib/whatsapp";
import { WhatsappIcon } from "./icons";

const BUTTON =
  "flex min-h-12 items-center justify-center gap-2 px-[30px] text-[15px] tracking-[1px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

/**
 * Size radios and the WhatsApp consult of one piece. The button waits for a size ("Elegí tu
 * talle", `aria-disabled` so pressing it can still send the focus to the sizes); a piece with a
 * single size has it preselected.
 */
export function SizePicker({
  name,
  sizes,
  colorLabel,
  priceGs,
  link,
  whatsappNumber,
  messageTemplate,
}: {
  name: string;
  sizes: CatalogSize[];
  colorLabel: string | null;
  priceGs: number | null;
  /** Absolute link to the piece, included in the message. */
  link: string | null;
  whatsappNumber: string;
  messageTemplate: string;
}) {
  const group = useId();
  const options = useRef<HTMLDivElement>(null);
  const available = sizes.filter((size) => size.available);
  const [selected, setSelected] = useState<string | null>(
    available.length === 1 ? (available[0]?.size ?? null) : null,
  );

  const href = selected
    ? buildPieceWhatsappUrl(whatsappNumber, messageTemplate, {
        producto: name,
        talle: selected,
        color: colorLabel,
        precio: priceGs === null ? null : formatGs(priceGs),
        link,
      })
    : null;

  return (
    <div className="flex flex-col gap-5">
      {sizes.length > 0 ? (
        <fieldset className="m-0 flex min-w-0 flex-col border-0 p-0">
          <legend className="mb-2 p-0 text-[11px] uppercase tracking-[0.22em] text-muted">
            Talle
          </legend>
          <div ref={options} role="radiogroup" aria-label="Talle" className="flex flex-wrap gap-2">
            {sizes.map(({ size, available: inStock }) => (
              <label
                key={size}
                className={cn(
                  "relative flex h-10 min-w-10 items-center justify-center border px-3 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
                  !inStock
                    ? "cursor-not-allowed border-line text-muted line-through"
                    : selected === size
                      ? "cursor-pointer border-ink bg-ink text-surface"
                      : "cursor-pointer border-line text-ink hover:border-ink",
                )}
              >
                <input
                  type="radio"
                  name={`${group}-talle`}
                  value={size}
                  checked={selected === size}
                  disabled={!inStock}
                  onChange={() => setSelected(size)}
                  className="absolute inset-0 size-full cursor-[inherit] appearance-none opacity-0"
                />
                {size}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(BUTTON, "self-start bg-wa text-surface hover:bg-wa/90")}
        >
          <WhatsappIcon className="size-5" />
          Realizar pedido
        </a>
      ) : (
        <button
          type="button"
          aria-disabled="true"
          onClick={() =>
            options.current?.querySelector<HTMLInputElement>("input:not(:disabled)")?.focus()
          }
          className={cn(BUTTON, "cursor-not-allowed self-start bg-line text-muted")}
        >
          <WhatsappIcon className="size-5" />
          {sizes.length > 0 ? "Elegí tu talle" : "Sin talles disponibles"}
        </button>
      )}
    </div>
  );
}
