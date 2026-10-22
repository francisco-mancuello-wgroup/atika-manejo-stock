import type { ReactNode } from "react";
import type { CurrencyDisplay } from "../lib/currency";
import { formatDate, moneyFormatter } from "../lib/format";
import type { SaleRow } from "../lib/view-models";
import { PageHeader } from "./page-header";
import { table } from "./styles";

export function VentasView({
  sales,
  children,
  display = { currency: "gs" },
}: {
  sales: SaleRow[];
  children: ReactNode;
  display?: CurrencyDisplay;
}) {
  const money = moneyFormatter(display.currency, display.exchangeRate);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ventas"
        description="Ventas registradas, de la más reciente a la más antigua."
      />
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1fr_340px]">
        <section className="flex flex-col gap-3">
          {sales.length === 0 ? (
            <p className="text-sm text-muted">Todavía no hay ventas registradas.</p>
          ) : (
            <div className={table.wrapper}>
              <table className={table.root}>
                <thead className={table.head}>
                  <tr>
                    <th className={table.th}>Fecha</th>
                    <th className={table.th}>Producto</th>
                    <th className={table.th}>Talle</th>
                    <th className={`${table.th} ${table.num}`}>Cant.</th>
                    <th className={`${table.th} ${table.num}`}>Precio</th>
                    <th className={`${table.th} ${table.num}`}>Total</th>
                    <th className={table.th}>Cliente</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id} className={table.row}>
                      <td className={table.td}>{formatDate(sale.date)}</td>
                      <td className={table.td}>{sale.productName}</td>
                      <td className={table.td}>{sale.size}</td>
                      <td className={`${table.td} ${table.num}`}>{sale.quantity}</td>
                      <td className={`${table.td} ${table.num}`}>{money(sale.unitPriceGs)}</td>
                      <td className={`${table.td} ${table.num}`}>{money(sale.totalGs)}</td>
                      <td className={table.td}>{sale.customer ?? "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {children}
      </div>
    </div>
  );
}
