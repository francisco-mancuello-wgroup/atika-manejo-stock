"use client";

import { cn } from "@atika/ui";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { parseCatalogFilters } from "../lib/catalog-filters";
import { findCategory } from "../lib/categories";
import { SearchIcon } from "./icons";

/**
 * GET search form. It stays in the category being browsed and carries the size and sort, so a
 * search narrows the current list instead of starting over. Below the tablet landscape width the
 * box is hidden behind a toggle button.
 */
export function TopbarSearch() {
  const pathname = usePathname();
  const filters = parseCatalogFilters(Object.fromEntries(useSearchParams()));
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  const slug = pathname.split("/")[1] ?? "";
  const action = findCategory(slug) ? `/${slug}` : "/";

  return (
    <>
      <button
        type="button"
        aria-label="Buscar"
        aria-expanded={open}
        aria-controls="catalog-search"
        onClick={() => setOpen((value) => !value)}
        className="flex size-11 items-center justify-center border border-line text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink lg:hidden"
      >
        <SearchIcon />
      </button>
      <form
        id="catalog-search"
        method="get"
        action={action}
        className={cn(
          "order-last w-full items-center gap-3 border border-line bg-bg px-3.5 lg:order-none lg:flex lg:h-11 lg:w-[360px]",
          open ? "flex h-11" : "hidden",
        )}
      >
        <SearchIcon className="size-[18px] shrink-0 text-muted" />
        <input
          ref={input}
          key={filters.q ?? ""}
          type="search"
          name="q"
          aria-label="Buscar prenda"
          placeholder="Buscar prenda"
          defaultValue={filters.q ?? ""}
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
        />
        {filters.talle ? <input type="hidden" name="talle" value={filters.talle} /> : null}
        {filters.orden !== "recientes" ? (
          <input type="hidden" name="orden" value={filters.orden} />
        ) : null}
      </form>
    </>
  );
}
