import { cn, Wordmark } from "@atika/ui";
import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "Resumen" },
  { href: "/inventario", label: "Inventario" },
  { href: "/compras", label: "Compras" },
  { href: "/ventas", label: "Ventas" },
  { href: "/catalogo-web", label: "Catálogo web" },
  { href: "/parametros", label: "Parámetros" },
] as const;

export function Sidebar({ activeHref = "/" }: { activeHref?: string }) {
  return (
    <aside className="flex w-[232px] shrink-0 flex-col gap-8 border-r border-line bg-surface px-4 py-6">
      <div className="flex flex-col gap-2 px-3">
        <Wordmark className="h-6 text-ink" />
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted">
          CASA ICONA
        </span>
      </div>
      <nav aria-label="Principal" className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = item.href === activeHref;
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
        <span className="font-display text-xl text-ink">₲ 7.400 / US$</span>
      </div>
    </aside>
  );
}
