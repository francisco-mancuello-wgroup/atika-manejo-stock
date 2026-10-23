import { cn } from "@atika/ui";
import Link from "next/link";
import type { CatalogTab } from "../lib/catalog-groups/workspace";
import { segmentClass, segmentedClass } from "./segmented";

const TABS: readonly [CatalogTab, string, string][] = [
  ["prendas", "Prendas", "/catalogo-web"],
  ["grupos", "Grupos", "/catalogo-web?tab=grupos"],
  ["marcas", "Marcas", "/catalogo-web?tab=marcas"],
];

/** Prendas (one by one), Grupos (published as a set) and Marcas (the lookbooks); the tab lives in the URL. */
export function CatalogTabs({ active }: { active: CatalogTab }) {
  return (
    <nav aria-label="Secciones del catálogo" className={cn(segmentedClass)}>
      {TABS.map(([tab, label, href]) => (
        <Link
          key={tab}
          href={href}
          aria-current={active === tab ? "page" : undefined}
          className={segmentClass(active === tab)}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
