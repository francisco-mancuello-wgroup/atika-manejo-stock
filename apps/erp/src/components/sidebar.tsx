"use client";

import { cn, Wordmark } from "@atika/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "../app/login/actions";
import { formatInteger } from "../lib/format";

const NAV_ITEMS = [
  { href: "/", label: "Resumen" },
  { href: "/inventario", label: "Inventario" },
  { href: "/compras", label: "Compras" },
  { href: "/ventas", label: "Ventas" },
  { href: "/catalogo-web", label: "Catálogo web" },
  { href: "/descuentos", label: "Descuentos" },
  { href: "/parametros", label: "Parámetros" },
] as const;

function isActive(href: string, currentPath: string): boolean {
  return href === "/"
    ? currentPath === "/"
    : currentPath === href || currentPath.startsWith(`${href}/`);
}

export function Sidebar({
  activeHref,
  email,
  exchangeRate,
}: {
  activeHref?: string;
  /** Signed-in account; the account block with the logout button shows only when present. */
  email?: string;
  /** Guaraníes per US dollar (AppSettings); a dash is shown when it could not be read. */
  exchangeRate?: number;
}) {
  const pathname = usePathname();
  const currentPath = activeHref ?? pathname ?? "/";
  return (
    <aside className="flex w-[232px] shrink-0 flex-col gap-8 border-r border-line bg-surface px-4 py-6">
      <div className="flex flex-col gap-2 px-3">
        <Wordmark className="h-6 self-start text-ink" />
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted">
          CASA ICONA
        </span>
      </div>
      <nav aria-label="Principal" className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, currentPath);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "border-l-2 px-3 py-2 text-sm transition-colors",
                active
                  ? "border-ink bg-subtle font-medium text-ink"
                  : "border-transparent text-muted hover:bg-subtle hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex flex-col gap-1 border-t border-line px-3 pt-4">
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted">
          TC DEL DÍA
        </span>
        <span className="font-display text-xl text-ink">{`₲ ${exchangeRate === undefined ? "–" : formatInteger(exchangeRate)} / US$`}</span>
      </div>
      {email ? (
        <form action={logoutAction} className="flex flex-col gap-2 border-t border-line px-3 pt-4">
          <span title={email} className="truncate text-xs text-muted">
            {email}
          </span>
          <button
            type="submit"
            className="self-start text-sm font-medium text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Salir
          </button>
        </form>
      ) : null}
    </aside>
  );
}
