"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "./icons";

export interface SortOption {
  value: string;
  label: string;
  href: string;
}

/** Sort control: a button that opens a short list of links (works without client state for the links). */
export function SortMenu({ options, current }: { options: SortOption[]; current: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const label = options.find((option) => option.value === current)?.label ?? options[0]?.label;

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent | MouseEvent) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (event instanceof MouseEvent && root.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", close);
    document.addEventListener("mousedown", close);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("mousedown", close);
    };
  }, [open]);

  return (
    <div ref={root} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="catalog-sort"
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 items-center gap-2 border border-line bg-surface px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {label}
        <ChevronDownIcon className="size-4" />
      </button>
      {open ? (
        <ul
          id="catalog-sort"
          className="absolute right-0 top-full z-20 mt-1 min-w-52 border border-line bg-surface py-1 shadow-sm"
        >
          {options.map((option) => (
            <li key={option.value}>
              <Link
                href={option.href}
                scroll={false}
                aria-current={option.value === current ? "true" : undefined}
                onClick={() => setOpen(false)}
                className="flex h-11 items-center px-4 text-sm text-muted hover:bg-subtle hover:text-ink aria-[current=true]:font-medium aria-[current=true]:text-ink"
              >
                {option.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
