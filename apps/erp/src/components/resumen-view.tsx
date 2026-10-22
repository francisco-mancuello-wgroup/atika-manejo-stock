import Link from "next/link";
import type { CurrencyDisplay } from "../lib/currency";
import { formatDate, formatInteger, moneyFormatter, moneyPair } from "../lib/format";
import type { ResumenData } from "../lib/queries/summary";
import { KpiCard } from "./kpi-card";
import { PageHeader } from "./page-header";
import { ProgressBar } from "./progress-bar";
import { table } from "./styles";

export function ResumenView({
  data,
  display = { currency: "gs" },
}: {
  data: ResumenData;
  display?: CurrencyDisplay;
}) {
  const { totals, lots, latestSales, monthSalesGs } = data;
  const money = moneyFormatter(display.currency, display.exchangeRate);
  const lotInvestment = (lot: { investmentGs: number; investmentUsd: number }) =>
    moneyPair(display.currency, lot.investmentGs, lot.investmentUsd);
  const investment = moneyPair(display.currency, totals.investmentGs, totals.investmentUsd);
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Resumen" description="Estado del stock, la inversión y las ventas." />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Unidades en stock"
          value={formatInteger(totals.stock)}
          detail={`de ${formatInteger(totals.unitsBought)} compradas`}
        />
        <KpiCard label="Unidades vendidas" value={formatInteger(totals.unitsSold)} />
        <KpiCard label="Inversión" value={investment.value} detail={investment.detail} />
        <KpiCard
          label="Stock valorizado"
          value={money(totals.stockValueGs)}
          detail="a precio de lista"
        />
        <KpiCard label="Ventas del mes" value={money(monthSalesGs)} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl text-ink">Compras por lote</h2>
        <div className={table.wrapper}>
          <table className={table.root}>
            <thead className={table.head}>
              <tr>
                <th className={table.th}>Lote</th>
                <th className={table.th}>Compra</th>
                <th className={table.th}>Vendidas / compradas</th>
                <th className={`${table.th} ${table.num}`}>Stock</th>
                <th className={`${table.th} ${table.num}`}>Inversión</th>
                <th className={`${table.th} ${table.num}`}>Stock valorizado</th>
              </tr>
            </thead>
            <tbody>
              {lots.map((lot) => (
                <tr key={lot.id} className={table.row}>
                  <td className={table.td}>
                    <Link
                      href={`/compras/${lot.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {lot.name}
                    </Link>
                  </td>
                  <td className={table.td}>{formatDate(lot.purchasedAt)}</td>
                  <td className={table.td}>
                    <div className="flex min-w-40 flex-col gap-1.5">
                      <span className="text-xs text-muted">
                        {formatInteger(lot.unitsSold)} / {formatInteger(lot.unitsBought)}
                      </span>
                      <ProgressBar
                        value={lot.unitsSold}
                        max={lot.unitsBought}
                        label={`Vendidas de ${lot.name}`}
                      />
                    </div>
                  </td>
                  <td className={`${table.td} ${table.num}`}>{formatInteger(lot.stock)}</td>
                  <td className={`${table.td} ${table.num}`}>
                    <div className="flex flex-col">
                      <span>{lotInvestment(lot).value}</span>
                      <span className="text-xs text-muted">{lotInvestment(lot).detail}</span>
                    </div>
                  </td>
                  <td className={`${table.td} ${table.num}`}>{money(lot.stockValueGs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl text-ink">Últimas ventas</h2>
        {latestSales.length === 0 ? (
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
                  <th className={`${table.th} ${table.num}`}>Total</th>
                </tr>
              </thead>
              <tbody>
                {latestSales.map((sale) => (
                  <tr key={sale.id} className={table.row}>
                    <td className={table.td}>{formatDate(sale.date)}</td>
                    <td className={table.td}>{sale.productName}</td>
                    <td className={table.td}>{sale.size}</td>
                    <td className={`${table.td} ${table.num}`}>{sale.quantity}</td>
                    <td className={`${table.td} ${table.num}`}>{money(sale.totalGs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
