import { cn } from "@atika/ui";
import Link from "next/link";
import { type CatalogFilters, catalogHref } from "../lib/catalog-filters";
import type { CatalogProduct } from "../lib/catalog-view";
import { formatGs } from "../lib/format";
import { buildWhatsappUrl } from "../lib/whatsapp";
import { WhatsappIcon } from "./icons";
import { ProductPhoto } from "./product-photo";

function Price({ product, className }: { product: CatalogProduct; className?: string }) {
  return (
    <p className={cn("whitespace-nowrap font-display font-medium text-ink", className)}>
      {product.priceGs === null ? "Consultar precio" : formatGs(product.priceGs)}
    </p>
  );
}

/**
 * The list of Propuesta C: one row per product. The name is the link that opens the detail
 * sheet; its box is stretched over the whole row, and the WhatsApp button sits above it so the
 * two links never nest.
 */
export function ProductRows({
  products,
  slug,
  filters,
  selectedId,
  whatsappNumber,
  messageTemplate,
}: {
  products: CatalogProduct[];
  slug: string;
  filters: CatalogFilters;
  selectedId: string | null;
  whatsappNumber: string;
  messageTemplate: string;
}) {
  return (
    <ul>
      {products.map((product) => (
        <li
          key={product.id}
          className={cn(
            "relative -mx-3 flex items-center gap-5 border-b border-line px-3 py-3.5 lg:gap-6",
            product.id === selectedId && "bg-subtle",
          )}
        >
          <div className="w-[72px] shrink-0 md:w-[84px]">
            <ProductPhoto src={product.imageUrl} alt={product.name} sizes="84px" size="row" />
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
            {product.brand ? (
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted">{product.brand}</p>
            ) : null}
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-[17px] font-medium text-ink lg:text-lg">
                <Link
                  href={catalogHref(slug, filters, { p: product.id })}
                  scroll={false}
                  className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink"
                >
                  {product.name}
                </Link>
              </h3>
              <Price product={product} className="text-[19px] lg:hidden" />
            </div>
            {product.detail ? (
              <p className="truncate text-[13px] text-muted">{product.detail}</p>
            ) : null}
            {product.sizes.length > 0 ? (
              <ul
                aria-label={`Talles de ${product.name}`}
                className="flex min-h-10 flex-wrap items-center gap-2 pr-28 lg:min-h-0 lg:pr-0"
              >
                {product.sizes.map(({ size, available }) => (
                  <li
                    key={size}
                    className={cn(
                      "flex h-8 min-w-10 items-center justify-center border px-2 text-xs",
                      available
                        ? "border-ink text-ink"
                        : "border-line bg-subtle text-muted line-through",
                    )}
                  >
                    {size}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="min-h-10 text-xs text-muted lg:min-h-0">Sin stock</p>
            )}
          </div>

          <div className="hidden w-[150px] shrink-0 flex-col items-end gap-1 lg:flex">
            <Price product={product} className="text-xl" />
            {product.priceGs === null ? null : (
              <p className="text-[11px] text-muted">IVA incluido</p>
            )}
          </div>

          <a
            href={buildWhatsappUrl(whatsappNumber, messageTemplate, { producto: product.name })}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Consultar ${product.name} por WhatsApp`}
            className="absolute right-3 bottom-3.5 z-10 flex h-10 items-center justify-center gap-2 bg-wa px-4 text-sm font-medium text-surface hover:bg-wa/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink lg:static lg:size-14 lg:shrink-0 lg:p-0"
          >
            <WhatsappIcon className="hidden size-6 lg:block" />
            <span className="lg:hidden">Consultar</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
