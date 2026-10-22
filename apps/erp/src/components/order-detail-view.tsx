import Link from "next/link";
import type { CurrencyDisplay } from "../lib/currency";
import { formatDate, moneyFormatter } from "../lib/format";
import { formatOrderNumber } from "../lib/orders/format";
import type { OrderDetail } from "../lib/queries/orders";
import { OrderStatusBadge } from "./order-status-badge";
import { PageHeader } from "./page-header";
import { table } from "./styles";

export function OrderDetailView({
  order,
  display = { currency: "gs" },
}: {
  order: OrderDetail;
  display?: CurrencyDisplay;
}) {
  const money = moneyFormatter(display.currency, display.exchangeRate);
  const placed = `Recibido el ${formatDate(order.date)}`;
  const description = order.decidedDate
    ? `${placed} · resuelto el ${formatDate(order.decidedDate)}`
    : placed;
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/ventas/pedidos"
        className="text-sm text-muted underline-offset-4 hover:underline"
      >
        ← Pedidos
      </Link>
      <PageHeader
        title={`Pedido ${formatOrderNumber(order.number)}`}
        description={description}
        actions={<OrderStatusBadge status={order.status} />}
      />

      <div className={table.wrapper}>
        <table className={table.root}>
          <thead className={table.head}>
            <tr>
              <th className={table.th}>Prenda</th>
              <th className={table.th}>Talle</th>
              <th className={table.th}>Color</th>
              <th className={`${table.th} ${table.num}`}>Cant.</th>
              <th className={`${table.th} ${table.num}`}>Precio</th>
              <th className={`${table.th} ${table.num}`}>Subtotal</th>
              <th className={`${table.th} ${table.num}`}>Stock hoy</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className={table.row}>
                <td className={`${table.td} font-medium`}>
                  <Link
                    href={`/inventario/${item.productId}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {item.productName}
                  </Link>
                </td>
                <td className={table.td}>{item.size}</td>
                <td className={table.td}>{item.color ?? "–"}</td>
                <td className={`${table.td} ${table.num}`}>{item.quantity}</td>
                <td className={`${table.td} ${table.num}`}>
                  {money(item.unitPriceGs)}
                  {item.discountPercent ? (
                    <span className="ml-2 text-xs text-muted">{`-${item.discountPercent} %`}</span>
                  ) : null}
                </td>
                <td className={`${table.td} ${table.num}`}>{money(item.subtotalGs)}</td>
                <td className={`${table.td} ${table.num}`}>
                  {item.stock}
                  {item.stock < item.quantity ? (
                    <span className="ml-2 text-xs text-warn">Sin stock suficiente</span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-line bg-subtle">
              <th scope="row" colSpan={5} className={`${table.th} ${table.num}`}>
                Total
              </th>
              <td className={`${table.td} ${table.num} font-medium`}>{money(order.totalGs)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
