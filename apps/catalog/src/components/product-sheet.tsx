"use client";

import { cn } from "@atika/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { CatalogProductDetail } from "../lib/catalog-view";
import { discountedPriceLabel } from "../lib/price";
import { buildWhatsappUrl } from "../lib/whatsapp";
import { BankPromosBlock } from "./bank-promos-block";
import { CloseIcon, WhatsappIcon } from "./icons";
import { Price } from "./price";
import { ProductPhoto } from "./product-photo";

const FOCUSABLE = "a[href], button:not([disabled])";

/**
 * Detail sheet of Propuesta C. The page renders it on the server when the URL has `?p=<id>`, so
 * it is deep-linkable and works before hydration (scrim and close button are plain links to the
 * list URL). On the client it also closes with Escape, keeps Tab inside, locks the page scroll
 * and gives the focus back to the row that opened it.
 */
export function ProductSheet({
  product,
  whatsappNumber,
  messageTemplate,
  closeHref,
}: {
  product: CatalogProductDetail;
  whatsappNumber: string;
  messageTemplate: string;
  closeHref: string;
}) {
  const router = useRouter();
  const titleId = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<string | null>(null);
  const [photo, setPhoto] = useState(0);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") router.replace(closeHref, { scroll: false });
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [router, closeHref]);

  function keepFocusInside(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;
    const items = Array.from(dialog.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    const first = items[0];
    const last = items.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const href = buildWhatsappUrl(whatsappNumber, messageTemplate, {
    producto: product.name,
    ...(size ? { talle: size } : {}),
    precio: discountedPriceLabel(product),
  });
  const current = product.images[photo]?.url ?? product.imageUrl;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <Link
        href={closeHref}
        replace
        scroll={false}
        aria-label="Cerrar"
        tabIndex={-1}
        className="absolute inset-0 bg-ink/40"
      />
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={keepFocusInside}
        className="relative flex h-full w-full max-w-[560px] flex-col gap-5 overflow-y-auto bg-bg px-5 pt-5 pb-7 sm:px-8 lg:max-w-[480px]"
      >
        <div className="flex justify-end">
          <Link
            href={closeHref}
            replace
            scroll={false}
            aria-label="Cerrar"
            className="flex size-10 items-center justify-center border border-line text-ink hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <CloseIcon />
          </Link>
        </div>

        <div className="flex gap-4">
          {product.images.length > 1 ? (
            <ul className="flex shrink-0 flex-col gap-2.5">
              {product.images.map((image, index) => (
                <li key={image.url}>
                  <button
                    type="button"
                    aria-label={`Ver foto ${index + 1}`}
                    aria-pressed={index === photo}
                    onClick={() => setPhoto(index)}
                    className={cn(
                      "block h-[88px] w-[66px] overflow-hidden border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                      index === photo ? "border-[1.5px] border-ink" : "border-line",
                    )}
                  >
                    {/* biome-ignore lint/performance/noImgElement: tiny fixed-size thumbnail */}
                    <img src={image.url} alt="" className="size-full object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="w-[225px] max-w-full shrink-0 pr-2 pb-2">
            <ProductPhoto src={current} alt={product.name} sizes="225px" size="sheet" priority />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          {product.brand ? (
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted">{product.brand}</p>
          ) : null}
          <h2 id={titleId} className="font-display text-[32px] font-medium leading-tight text-ink">
            {product.name}
          </h2>
          <div className="flex items-baseline gap-2">
            <p className="font-display text-[22px] font-medium text-ink">
              <Price {...product} align="start" />
            </p>
            {product.priceGs === null ? null : (
              <p className="text-[11px] text-muted">IVA incluido</p>
            )}
          </div>
        </div>

        {product.sizes.length > 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted">Talle</p>
            <ul className="flex flex-wrap gap-2">
              {product.sizes.map(({ size: label, available }) => (
                <li key={label}>
                  <button
                    type="button"
                    disabled={!available}
                    aria-pressed={available ? size === label : undefined}
                    onClick={() => setSize(size === label ? null : label)}
                    className={cn(
                      "h-12 min-w-16 border px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                      available
                        ? size === label
                          ? "border-ink bg-ink text-surface"
                          : "border-line bg-surface text-ink hover:border-ink"
                        : "cursor-not-allowed border-line bg-subtle text-muted line-through",
                    )}
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {product.color || product.description ? (
          <div className="flex flex-col gap-1 text-[13px] leading-relaxed text-muted">
            {product.color ? <p>{product.color}</p> : null}
            {product.description ? <p>{product.description}</p> : null}
          </div>
        ) : null}

        <BankPromosBlock groups={product.bankPromos ?? []} />

        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto flex h-14 w-full items-center justify-center gap-2 bg-wa text-base font-medium text-surface hover:bg-wa/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <WhatsappIcon className="size-5" />
          {size ? "Realizar pedido" : "Consultar por WhatsApp"}
        </a>
      </div>
    </div>
  );
}
