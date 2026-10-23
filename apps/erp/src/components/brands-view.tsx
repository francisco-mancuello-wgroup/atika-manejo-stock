import { cn } from "@atika/ui";
import type { FormState } from "../lib/action-state";
import type { BrandRow } from "../lib/brands/save";
import { BrandCoverControl, BrandOrderButtons } from "./brand-controls";
import { CatalogTabs } from "./catalog-tabs";
import { GroupSwitch } from "./group-switch";
import { PageHeader } from "./page-header";
import { table } from "./styles";

export interface BrandsViewActions {
  setActive: (brandId: string, active: boolean) => Promise<FormState>;
  move: (brandId: string, direction: "up" | "down") => Promise<FormState>;
  saveCover: (brandId: string, previous: FormState, formData: FormData) => Promise<FormState>;
  removeCover: (brandId: string) => Promise<FormState>;
}

/**
 * Marcas tab of the web catalog: every brand is one lookbook on the web. Here the owner turns
 * brands on or off, sets their order on the home and gives each one a cover.
 */
export function BrandsView({
  brands,
  actions,
}: {
  brands: BrandRow[];
  actions: BrandsViewActions;
}) {
  const movable = brands.filter((brand) => !brand.isFallback);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Catálogo web"
        description="Cada marca es un catálogo en la web: las prendas de una marca se agrupan solas. Elegí cuáles se ven, en qué orden y con qué portada."
      />
      <CatalogTabs active="marcas" />
      <p role="note" className="border border-line bg-surface px-4 py-3 text-sm text-ink">
        Una marca inactiva se oculta de toda la web: catálogo, Ver todo, buscador, Pink y pedidos.
        Las prendas sin marca (o con una marca sin registrar) van a Otras marcas. Sin portada, la
        marca muestra la primera foto de su catálogo.
      </p>

      <div className={table.wrapper}>
        <table className={table.root}>
          <thead className={table.head}>
            <tr>
              <th className={table.th}>Marca</th>
              <th className={`${table.th} ${table.num}`}>Prendas</th>
              <th className={`${table.th} ${table.num}`}>En la web</th>
              <th className={table.th}>Portada</th>
              <th className={table.th}>Orden</th>
              <th className={table.th}>Activa en la web</th>
            </tr>
          </thead>
          <tbody>
            {brands.map((brand) => {
              const index = movable.findIndex((candidate) => candidate.id === brand.id);
              return (
                <tr key={brand.id} className={cn(table.row, !brand.isActive && "text-muted")}>
                  <td className={cn(table.td, "font-medium")}>
                    {brand.name}{" "}
                    {brand.isFallback ? (
                      <span className="block text-xs font-normal text-muted">
                        Prendas sin marca
                      </span>
                    ) : null}
                  </td>
                  <td className={`${table.td} ${table.num}`}>{brand.productCount}</td>
                  <td className={`${table.td} ${table.num}`}>{brand.visibleCount}</td>
                  <td className={table.td}>
                    <BrandCoverControl
                      brand={brand}
                      saveCover={actions.saveCover}
                      removeCover={actions.removeCover}
                    />
                  </td>
                  <td className={table.td}>
                    {brand.isFallback ? (
                      <span className="text-xs text-muted">Siempre al final</span>
                    ) : (
                      <BrandOrderButtons
                        brand={brand}
                        canMoveUp={index > 0}
                        canMoveDown={index < movable.length - 1}
                        move={actions.move}
                      />
                    )}
                  </td>
                  <td className={table.td}>
                    <GroupSwitch
                      groupId={brand.id}
                      name={brand.name}
                      isActive={brand.isActive}
                      action={actions.setActive}
                      label={`Activa en la web: ${brand.name}`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
