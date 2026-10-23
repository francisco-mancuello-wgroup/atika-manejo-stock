import Link from "next/link";
import { formatDate, formatGs, formatInteger } from "../lib/format";
import type { LotSummary } from "../lib/view-models";
import { PageHeader } from "./page-header";
import { ProgressBar } from "./progress-bar";
import { table } from "./styles";

export function ComprasView({ lots }: { lots: LotSummary[] }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Compras"
        description="Marcas compradas a proveedores y sus parámetros de precio."
      />
      {lots.length === 0 ? (
        <p className="text-sm text-muted">Todavía no hay compras cargadas.</p>
      ) : (
        <div className={table.wrapper}>
          <table className={table.root}>
            <thead className={table.head}>
              <tr>
                <th className={table.th}>Marca</th>
                <th className={table.th}>Proveedor</th>
                <th className={table.th}>Compra</th>
                <th className={`${table.th} ${table.num}`}>TC</th>
                <th className={`${table.th} ${table.num}`}>Modelos</th>
                <th className={table.th}>Vendidas / compradas</th>
                <th className={`${table.th} ${table.num}`}>Stock</th>
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
                  <td className={table.td}>{lot.supplier}</td>
                  <td className={table.td}>{formatDate(lot.purchasedAt)}</td>
                  <td className={`${table.td} ${table.num}`}>{formatGs(lot.exchangeRate)}</td>
                  <td className={`${table.td} ${table.num}`}>{lot.products}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
