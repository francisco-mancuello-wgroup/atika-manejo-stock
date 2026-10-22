"use client";

import { cn, Wordmark } from "@atika/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";
import { logoutAction } from "../app/login/actions";
import { formatInteger } from "../lib/format";

/** `exact` links only match their own URL (their group has pages nested under the same prefix). */
type NavLink = { href: string; label: string; exact?: boolean };
type NavGroup = { label: string; items: readonly NavLink[] };

const NAV_ITEMS: readonly (NavLink | NavGroup)[] = [
  { href: "/", label: "Resumen" },
  { href: "/inventario", label: "Inventario" },
  { href: "/compras", label: "Compras" },
  {
    label: "Ventas",
    items: [
      { href: "/ventas", label: "Registradas", exact: true },
      { href: "/ventas/pedidos", label: "Pedidos" },
    ],
  },
  { href: "/catalogo-web", label: "Catálogo web" },
  { href: "/datos-bancarios", label: "Datos bancarios" },
  {
    label: "Promos",
    items: [
      { href: "/promos/descuentos", label: "Descuentos" },
      { href: "/promos/bancos", label: "Bancos" },
    ],
  },
  { href: "/parametros", label: "Parámetros" },
  { href: "/seguridad", label: "Seguridad" },
];

function NavItem({
  item,
  currentPath,
  nested = false,
  onNavigate,
}: {
  item: NavLink;
  currentPath: string;
  nested?: boolean;
  onNavigate?: () => void;
}) {
  const active = isActive(item, currentPath);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "border-l-2 py-2 text-sm transition-colors",
        nested ? "pr-3 pl-6" : "px-3",
        active
          ? "border-ink bg-subtle font-medium text-ink"
          : "border-transparent text-muted hover:bg-subtle hover:text-ink",
      )}
    >
      {item.label}
    </Link>
  );
}

/** Collapsible group; it starts open when one of its pages is the current one. */
function NavDropdown({
  group,
  currentPath,
  onNavigate,
}: {
  group: NavGroup;
  currentPath: string;
  onNavigate?: () => void;
}) {
  const containsCurrent = group.items.some((item) => isActive(item, currentPath));
  const [open, setOpen] = useState(containsCurrent);
  const listId = useId();
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex items-center justify-between border-l-2 border-transparent px-3 py-2 text-left text-sm transition-colors hover:bg-subtle hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
          containsCurrent ? "font-medium text-ink" : "text-muted",
        )}
      >
        {group.label}
        <span
          aria-hidden="true"
          className={cn("text-xs transition-transform", open && "rotate-180")}
        >
          ▾
        </span>
      </button>
      {open ? (
        <div id={listId} className="flex flex-col gap-1">
          {group.items.map((child) => (
            <NavItem
              key={child.href}
              item={child}
              currentPath={currentPath}
              nested
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function isActive({ href, exact }: NavLink, currentPath: string): boolean {
  if (href === "/" || exact) return currentPath === href;
  return currentPath === href || currentPath.startsWith(`${href}/`);
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
  // Phones get a top bar with a Menú button; from md up the sidebar is always open.
  const [menuOpen, setMenuOpen] = useState(false);
  const panelId = useId();
  const closeMenu = () => setMenuOpen(false);
  return (
    <aside className="flex shrink-0 flex-col border-b border-line bg-surface px-4 py-4 md:w-[232px] md:gap-8 md:border-r md:border-b-0 md:py-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-2 px-3">
          <Wordmark className="h-6 self-start text-ink" />
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted">
            CASA ICONA
          </span>
        </div>
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-controls={panelId}
          onClick={() => setMenuOpen((open) => !open)}
          className="min-h-11 border border-line px-4 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink md:hidden"
        >
          {menuOpen ? "Cerrar menú" : "Menú"}
        </button>
      </div>
      <div
        id={panelId}
        className={cn("flex-1 flex-col gap-8 pt-6 md:flex md:pt-0", menuOpen ? "flex" : "hidden")}
      >
        <nav aria-label="Principal" className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) =>
            "items" in item ? (
              <NavDropdown
                key={item.label}
                group={item}
                currentPath={currentPath}
                onNavigate={closeMenu}
              />
            ) : (
              <NavItem
                key={item.href}
                item={item}
                currentPath={currentPath}
                onNavigate={closeMenu}
              />
            ),
          )}
        </nav>
        <div className="flex flex-col gap-1 border-t border-line px-3 pt-4">
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted">
            TC DEL DÍA
          </span>
          <span className="font-display text-xl text-ink">{`₲ ${exchangeRate === undefined ? "–" : formatInteger(exchangeRate)} / US$`}</span>
        </div>
        {email ? (
          <form
            action={logoutAction}
            className="flex flex-col gap-2 border-t border-line px-3 pt-4"
          >
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
      </div>
    </aside>
  );
}
