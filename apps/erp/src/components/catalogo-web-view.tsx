import { Button, cn, Input } from "@atika/ui";
import Link from "next/link";
import type { FormState } from "../lib/action-state";
import type { BrandFilter } from "../lib/brands/filter";
import { CATALOG_STATUSES, type CatalogFilters, catalogHref } from "../lib/catalog/filters";
import type { CurrencyDisplay } from "../lib/currency";
import { moneyFormatter } from "../lib/format";
import type { CatalogProduct, CatalogSettingsView } from "../lib/queries/catalog";
import { BulkVisibilitySwitch } from "./bulk-visibility-switch";
import { CatalogSettingsForm } from "./catalog-settings-form";
import { CatalogTabs } from "./catalog-tabs";
import { Field } from "./form-controls";
import { PageHeader } from "./page-header";
import { CategorySelect, VisibilitySwitch } from "./product-controls";
import { ProductThumb } from "./product-thumb";
import { PublishAllForm } from "./publish-all-form";
import { table } from "./styles";

type FormAction = (previous: FormState, formData: FormData) => Promise<FormState>;

export interface CatalogActions {
  setVisibility: (productId: string, isPublished: boolean) => Promise<FormState>;
  setCategory: (productId: string, category: string) => Promise<FormState>;
  setVisibilityMany: (productIds: string[], isPublished: boolean) => Promise<FormState>;
  publishAll: FormAction;
  saveSettings: FormAction;
}

const STATUS_LABELS = {
  todos: "Todos",
  visibles: "Visibles",
  ocultos: "Ocultos",
  "sin-stock": "Sin stock",
} as const;

const filterLink = (active: boolean) =>
  cn(
    "border border-line px-3 py-1.5 text-sm",
    active ? "border-ink bg-ink text-surface" : "bg-surface text-muted hover:text-ink",
  );

export function CatalogoWebView({
  products,
  settings,
  filters,
  brands = [],
  actions,
  display = { currency: "gs" },
  activeGroupNames = [],
}: {
  products: CatalogProduct[];
  settings: CatalogSettingsView;
  filters: CatalogFilters;
  /** Brand links of the filter, in display order. */
  brands?: BrandFilter[];
  actions: CatalogActions;
  display?: CurrencyDisplay;
  /** Names of the groups active now: while any is, the web ignores the manual publication. */
  activeGroupNames?: string[];
}) {
  const money = moneyFormatter(display.currency, display.exchangeRate);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Catálogo web"
        description="Elegí qué prendas se ven en el catálogo público. Los cambios se aplican al instante."
        actions={<PublishAllForm action={actions.publishAll} />}
      />
      <CatalogTabs active="prendas" />
      {activeGroupNames.length > 0 ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 border border-line bg-surface px-4 py-3 text-sm text-ink"
        >
          <p>
            {`Hay un grupo activo (${activeGroupNames.join(", ")}): sus prendas son la selección Pink de la portada, con el stock asignado.`}
          </p>
          <Link href="/catalogo-web?tab=grupos" className="font-medium underline">
            Ver grupos
          </Link>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <nav aria-label="Filtro por estado" className="flex gap-1">
          {CATALOG_STATUSES.map((status) => {
            const active = filters.status === status;
            return (
              <Link
                key={status}
                href={catalogHref({ ...filters, status })}
                aria-current={active ? "page" : undefined}
                className={filterLink(active)}
              >
                {STATUS_LABELS[status]}
              </Link>
            );
          })}
        </nav>
        <nav aria-label="Filtro por marca" className="flex flex-wrap gap-1">
          {[undefined, ...brands].map((brand) => {
            const active = brand ? filters.brand === brand.slug : !filters.brand;
            const { brand: _omit, ...rest } = filters;
            return (
              <Link
                key={brand?.slug ?? "todas"}
                href={catalogHref(brand ? { ...rest, brand: brand.slug } : rest)}
                aria-current={active ? "page" : undefined}
                className={filterLink(active)}
              >
                {brand ? `${brand.name} (${brand.count})` : "Todas"}
              </Link>
            );
          })}
        </nav>
        <search>
          <form method="get" action="/catalogo-web" className="flex items-end gap-3">
            {filters.status !== "todos" ? (
              <input type="hidden" name="estado" value={filters.status} />
            ) : null}
            {filters.brand ? <input type="hidden" name="marca" value={filters.brand} /> : null}
            <div className="w-64">
              <Field label="Buscar" htmlFor="q">
                <Input
                  id="q"
                  name="q"
                  type="search"
                  placeholder="Nombre, código o color"
                  defaultValue={filters.query ?? ""}
                />
              </Field>
            </div>
            <Button type="submit" variant="secondary">
              Buscar
            </Button>
          </form>
        </search>
      </div>

      <p className="text-sm text-muted">
        {products.length} {products.length === 1 ? "producto" : "productos"}
      </p>

      {products.length === 0 ? (
        <p className="text-sm text-muted">No hay productos que coincidan con el filtro.</p>
      ) : (
        <div className={table.wrapper}>
          <table className={table.root}>
            <thead className={table.head}>
              <tr>
                <th className={table.th}>Producto</th>
                <th className={table.th}>Marca</th>
                <th className={table.th}>Talles disponibles</th>
                <th className={`${table.th} ${table.num}`}>Precio</th>
                <th className={table.th}>Categoría</th>
                <th className={table.th}>
                  <div className="flex items-center gap-3">
                    Visible
                    <BulkVisibilitySwitch
                      productIds={products.map((product) => product.id)}
                      allVisible={products.every((product) => product.isPublished)}
                      action={actions.setVisibilityMany}
                    />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className={table.row}>
                  <td className={cn(table.td, "font-medium")}>
                    <div className="flex items-center gap-3">
                      <ProductThumb src={product.imageUrl} name={product.name} />
                      <div className="flex flex-col items-start gap-1">
                        {product.name}
                        {product.groupName ? (
                          <span className="bg-subtle px-2 py-0.5 text-[11px] font-medium text-ink">
                            {`Grupo: ${product.groupName}`}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className={cn(table.td, "text-muted")}>{product.lotName}</td>
                  <td className={table.td}>
                    {product.sizes.length > 0 ? (
                      product.sizes.join(" · ")
                    ) : (
                      <span className="bg-warnbg px-2 py-0.5 text-xs text-warn">Sin stock</span>
                    )}
                  </td>
                  <td className={`${table.td} ${table.num}`}>{money(product.priceGs)}</td>
                  <td className={table.td}>
                    <CategorySelect
                      productId={product.id}
                      name={product.name}
                      category={product.category}
                      action={actions.setCategory}
                    />
                  </td>
                  <td className={table.td}>
                    <VisibilitySwitch
                      productId={product.id}
                      name={product.name}
                      isPublished={product.isPublished}
                      action={actions.setVisibility}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="max-w-2xl">
        <CatalogSettingsForm settings={settings} action={actions.saveSettings} />
      </div>
    </div>
  );
}
