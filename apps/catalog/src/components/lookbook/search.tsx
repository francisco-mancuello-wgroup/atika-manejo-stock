"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { objectPosition } from "../../lib/focus";
import { type SearchEntry, searchEntries } from "../../lib/search";
import { CloseIcon, SearchIcon } from "./icons";

/**
 * Magnifier in the lookbook bar: opens a search over every page on screen (name, color, catalog,
 * section) and jumps to the page of the chosen piece. The native <dialog> handles focus and
 * Escape.
 */
export function LookbookSearch({ entries }: { entries: SearchEntry[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchEntries(entries, query), [entries, query]);

  const go = (anchor: string) => {
    dialog.current?.close();
    history.replaceState(null, "", `#${anchor}`);
    document.getElementById(anchor)?.scrollIntoView();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-label="Buscar prendas"
        className="pointer-events-auto inline-flex size-11 items-center justify-center rounded-full bg-background/85 backdrop-blur transition-colors hover:bg-surface"
      >
        <SearchIcon className="size-4" />
      </button>

      {/* biome-ignore lint/a11y/useKeyWithClickEvents: the backdrop click mirrors Escape, which the native dialog already handles */}
      <dialog
        ref={dialog}
        aria-label="Buscar prendas"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
        className="pointer-events-auto m-0 mx-auto mt-0 h-dvh max-h-none w-full max-w-xl bg-background p-0 text-foreground backdrop:bg-foreground/60 sm:mt-16 sm:h-auto sm:max-h-[75dvh] sm:rounded-[4px]"
      >
        <div className="flex h-full flex-col sm:max-h-[75dvh]">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <SearchIcon className="size-4 shrink-0 text-fg-muted" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              // biome-ignore lint/a11y/noAutofocus: the dialog opens to type a search
              autoFocus
              placeholder="Buscá por prenda, color o catálogo"
              aria-label="Buscar"
              className="min-h-11 flex-1 bg-transparent text-base outline-none placeholder:text-fg-muted"
            />
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Cerrar"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-surface"
            >
              <CloseIcon className="size-4" />
            </button>
          </div>

          {query.trim() !== "" && (
            <ul className="flex-1 overflow-y-auto p-2" aria-live="polite">
              {results.length === 0 ? (
                <li className="px-3 py-8 text-center text-sm text-fg-muted">
                  No encontramos prendas para “{query.trim()}”.
                </li>
              ) : (
                results.map((entry) => (
                  <li key={entry.anchor}>
                    <button
                      type="button"
                      onClick={() => go(entry.anchor)}
                      className="flex w-full items-center gap-4 rounded-[3px] p-2 text-left transition-colors hover:bg-surface"
                    >
                      <span className="relative size-16 shrink-0 overflow-hidden rounded-[3px] bg-surface">
                        {entry.photo && (
                          <Image
                            src={entry.photo}
                            alt=""
                            fill
                            sizes="64px"
                            className="object-cover"
                            style={{ objectPosition: objectPosition(entry.photoFocus) }}
                          />
                        )}
                      </span>
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="font-heading text-lg leading-tight">{entry.title}</span>
                        <span className="text-[11px] tracking-[2px] text-fg-muted uppercase">
                          {[entry.catalog, entry.section].filter(Boolean).join(" · ")}
                        </span>
                        {entry.colors.length > 0 && (
                          <span className="text-sm text-fg-muted">{entry.colors.join(", ")}</span>
                        )}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      </dialog>
    </>
  );
}
