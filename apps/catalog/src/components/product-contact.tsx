"use client";

import { buttonVariants, cn } from "@atika/ui";
import { useState } from "react";
import type { CatalogSize } from "../lib/catalog-view";
import { buildWhatsappUrl } from "../lib/whatsapp";

export function ProductContact({
  productName,
  sizes,
  whatsappNumber,
  messageTemplate,
  priceLabel = null,
}: {
  productName: string;
  sizes: CatalogSize[];
  whatsappNumber: string;
  messageTemplate: string;
  /** Discounted price to mention in the message (`₲ 360.000 (-20 %)`), when a discount applies. */
  priceLabel?: string | null;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const href = buildWhatsappUrl(whatsappNumber, messageTemplate, {
    producto: productName,
    ...(selected ? { talle: selected } : {}),
    precio: priceLabel,
  });

  return (
    <div className="flex flex-col gap-6">
      {sizes.length > 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">Talle</p>
          <ul className="flex flex-wrap gap-2">
            {sizes.map(({ size, available }) => (
              <li key={size}>
                <button
                  type="button"
                  disabled={!available}
                  aria-pressed={available ? selected === size : undefined}
                  onClick={() => setSelected(selected === size ? null : size)}
                  className={cn(
                    "h-10 min-w-12 border px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                    available
                      ? selected === size
                        ? "border-ink bg-ink text-surface"
                        : "border-line bg-surface text-ink hover:border-ink"
                      : "cursor-not-allowed border-line bg-subtle text-muted line-through",
                  )}
                >
                  {size}
                </button>
              </li>
            ))}
          </ul>
          {selected ? null : (
            <p className="text-xs text-muted">Elegí un talle para incluirlo en el mensaje.</p>
          )}
        </div>
      ) : null}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(buttonVariants({ variant: "whatsapp", size: "lg" }), "self-start")}
      >
        Consultar por WhatsApp
      </a>
    </div>
  );
}
