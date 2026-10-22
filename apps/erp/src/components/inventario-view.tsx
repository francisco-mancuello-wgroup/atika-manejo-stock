import { Button, buttonVariants, cn, Input } from "@atika/ui";
import Link from "next/link";
import type { CurrencyDisplay } from "../lib/currency";
import { moneyFormatter } from "../lib/format";
import type { InventoryFilters } from "../lib/inventory-filters";
import type { InventoryProduct } from "../lib/view-models";
import { Field, Select } from "./form-controls";
import { PageHeader } from "./page-header";
import { ProductThumb } from "./product-thumb";
import { table } from "./styles";

export function InventarioView({
  products,
  lots,
  filters,
  display = { currency: "gs" },
}: {
  products: InventoryProduct[];
  lots: { id: string; name: string }[];
  filters: InventoryFilters;
  display?: CurrencyDisplay;
}) {
  const money = moneyFormatter(display.currency, display.exchangeRate);
  const filtered = Boolean(filters.lotId || filters.query);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Inventario"
        description="Productos con el stock disponible por talle."
        actions={
          <Link href="/inventario/nuevo" className={buttonVariants()}>
            Nuevo producto
          </Link>
        }
      />

      <search>
        <form
          method="get"
          action="/inventario"
          className="flex flex-wrap items-end gap-4 border border-line bg-surface p-4"
        >
          <div className="w-56">
            <Field label="Lote" htmlFor="lot">
              <Select id="lot" name="lot" defaultValue={filters.lotId ?? ""}>
                <option value="">Todos los lotes</option>
                {lots.map((lot) => (
                  <option key={lot.id} value={lot.id}>
                    {lot.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="w-80">
            <Field label="Buscar" htmlFor="q">
              <Input
                id="q"
                name="q"
                type="search"
                placeholder="Nombre, código, color o código de barras"
                defaultValue={filters.query ?? ""}
              />
            </Field>
          </div>
          <Button type="submit">Filtrar</Button>
          {filtered ? (
            <Link
              href="/inventario"
              className="pb-2.5 text-sm text-muted underline-offset-4 hover:underline"
            >
              Limpiar
            </Link>
          ) : null}
        </form>
      </search>

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
                <th className={table.th}>Lote</th>
                <th className={table.th}>Código</th>
                <th className={table.th}>Stock por talle</th>
                <th className={`${table.th} ${table.num}`}>Precio</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                // The product link is stretched over the row, so clicking anywhere opens it.
                <tr
                  key={product.id}
                  className={cn(table.row, "relative cursor-pointer hover:bg-subtle")}
                >
                  <td className={table.td}>
                    <div className="flex items-center gap-3">
                      <ProductThumb src={product.imageUrl} name={product.name} />
                      <div className="flex flex-col">
                        <Link
                          href={`/inventario/${product.id}`}
                          className="font-medium underline-offset-4 after:absolute after:inset-0 hover:underline focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-ink"
                        >
                          {product.name}
                        </Link>
                        {product.color ? (
                          <span className="text-xs text-muted">{product.color}</span>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className={table.td}>
                    <Link
                      href={`/compras/${product.lotId}`}
                      className="relative z-10 underline-offset-4 hover:underline"
                    >
                      {product.lotName}
                    </Link>
                  </td>
                  <td className={cn(table.td, "text-muted")}>{product.code ?? "–"}</td>
                  <td className={table.td}>
                    <ul className="flex flex-wrap gap-1.5">
                      {product.sizes.map(({ size, stock }) => (
                        <li
                          key={size}
                          className={cn(
                            "px-2 py-0.5 text-xs tabular-nums",
                            stock === 0 ? "bg-warnbg text-warn" : "bg-subtle text-ink",
                          )}
                        >
                          {`${size} ${stock}`}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className={`${table.td} ${table.num}`}>{money(product.priceGs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
