import { cn } from "@atika/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import { type CatalogFilters, catalogHref, SORT_ORDERS } from "../lib/catalog-filters";
import { CATEGORIES, findCategory } from "../lib/categories";
import { FILTER_SIZES } from "../lib/sizes";
import { SortMenu } from "./sort-menu";

const NOTE = "Precios con IVA incluido. Consultas y reservas por WhatsApp.";

const chip =
  "flex items-center justify-center border text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
const chipOn = "border-ink bg-ink text-surface";
const chipOff = "border-line bg-surface text-ink hover:border-ink";

function countLine(total: number, filters: CatalogFilters): string {
  const parts = [`${total} ${total === 1 ? "prenda" : "prendas"}`];
  if (filters.talle) parts.push(`talle ${filters.talle}`);
  if (filters.q) parts.push(`“${filters.q}”`);
  return parts.join(" · ");
}

/**
 * Page frame of the catalog (Propuesta C): left rail on tablet landscape, category tabs and a
 * size row below it, then the list header with its sort control. Every control is a link to the
 * same page with other search params, so the list is always server-rendered and shareable.
 */
export function CatalogLayout({
  slug,
  filters,
  counts,
  total,
  children,
}: {
  slug: string;
  filters: CatalogFilters;
  counts: Record<string, number>;
  total: number;
  children: ReactNode;
}) {
  const category = findCategory(slug) ?? CATEGORIES[0];
  const sortOptions = SORT_ORDERS.map((order) => ({
    ...order,
    href: catalogHref(slug, filters, { orden: order.value }),
  }));

  return (
    <div className="lg:flex">
      <aside className="hidden w-[220px] shrink-0 flex-col gap-7 border-r border-line px-6 py-7 lg:flex">
        <nav aria-label="Categorías" className="flex flex-col gap-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted">
            Categorías
          </p>
          <ul className="flex flex-col">
            {CATEGORIES.map((item) => (
              <li key={item.slug}>
                <Link
                  href={catalogHref(item.slug, filters)}
                  aria-current={item.slug === category.slug ? "page" : undefined}
                  className={cn(
                    "flex h-11 items-center justify-between border-l-2 px-3 text-[15px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                    item.slug === category.slug
                      ? "border-ink bg-subtle font-medium text-ink"
                      : "border-transparent text-muted hover:text-ink",
                  )}
                >
                  {item.label}
                  <span className="text-xs font-normal text-muted">{counts[item.slug] ?? 0}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <fieldset aria-label="Talle" className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted">Talle</p>
          <ul className="grid grid-cols-3 gap-2">
            {FILTER_SIZES.map((size) => {
              const active = filters.talle === size;
              return (
                <li key={size}>
                  <Link
                    href={catalogHref(slug, filters, { talle: active ? null : size })}
                    aria-current={active ? "true" : undefined}
                    className={cn(chip, "h-10", active ? chipOn : chipOff)}
                  >
                    {size}
                  </Link>
                </li>
              );
            })}
          </ul>
        </fieldset>
        <p className="text-xs leading-relaxed text-muted">{NOTE}</p>
      </aside>

      <div className="min-w-0 flex-1">
        <nav
          aria-label="Categorías, vista compacta"
          className="flex gap-6 overflow-x-auto border-b border-line px-5 md:px-7 lg:hidden"
        >
          {CATEGORIES.map((item) => (
            <Link
              key={item.slug}
              href={catalogHref(item.slug, filters)}
              aria-current={item.slug === category.slug ? "page" : undefined}
              className={cn(
                "-mb-px h-12 shrink-0 border-b-2 text-[15px] leading-[48px] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink",
                item.slug === category.slug
                  ? "border-ink font-medium text-ink"
                  : "border-transparent text-muted",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <header className="flex items-end justify-between gap-4 px-5 pt-6 pb-2 md:px-7 lg:px-8 lg:pb-3">
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="font-display text-[34px] font-medium leading-none text-ink md:text-4xl lg:text-[40px]">
              {category.label}
            </h1>
            <p className="text-[13px] text-muted">{countLine(total, filters)}</p>
          </div>
          <SortMenu options={sortOptions} current={filters.orden} />
        </header>

        <fieldset
          aria-label="Talle, vista compacta"
          className="m-0 flex min-w-0 items-center gap-2 overflow-x-auto border-0 px-5 pt-2 pb-3 md:px-7 lg:hidden"
        >
          <span className="mr-1 shrink-0 text-[13px] text-muted">Talle</span>
          {[null, ...FILTER_SIZES].map((size) => {
            const active = (filters.talle ?? null) === size;
            return (
              <Link
                key={size ?? "todos"}
                href={catalogHref(slug, filters, { talle: size })}
                aria-current={active ? "true" : undefined}
                className={cn(chip, "h-10 shrink-0 px-4", active ? chipOn : chipOff)}
              >
                {size ?? "Todos"}
              </Link>
            );
          })}
        </fieldset>

        <div className="px-5 pb-12 md:px-7 lg:px-8">{children}</div>
        <p className="px-5 pb-10 text-xs text-muted md:px-7 lg:hidden">{NOTE}</p>
      </div>
    </div>
  );
}
