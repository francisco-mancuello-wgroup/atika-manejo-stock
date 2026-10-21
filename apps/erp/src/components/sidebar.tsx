import { cn } from "@atika/ui";
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
      <div className="px-3 font-display text-2xl text-ink">atika</div>
      <nav aria-label="Principal" className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = item.href === activeHref;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-subtle font-medium text-ink"
                  : "text-muted hover:bg-subtle hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
