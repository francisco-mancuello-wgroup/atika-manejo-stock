import type { OrderStatus } from "@atika/db";
import Link from "next/link";
import type { CurrencyDisplay } from "../lib/currency";
import { formatDate, moneyFormatter } from "../lib/format";
import { formatOrderNumber, ORDER_STATUSES } from "../lib/orders/format";
import type { OrderSummary } from "../lib/queries/orders";
import { OrderStatusBadge } from "./order-status-badge";
import { PageHeader } from "./page-header";
import { segmentClass, segmentedClass } from "./segmented";
import { table } from "./styles";

const FILTERS: readonly (readonly [OrderStatus | undefined, string])[] = [
  [undefined, "Todos"],
  [ORDER_STATUSES[0], "Pendientes"],
  [ORDER_STATUSES[1], "Aprobados"],
  [ORDER_STATUSES[2], "Rechazados"],
];

const EMPTY_FILTERED: Record<OrderStatus, string> = {
  pending: "No hay pedidos pendientes.",
  approved: "No hay pedidos aprobados.",
  rejected: "No hay pedidos rechazados.",
};

const hrefFor = (status: OrderStatus | undefined) =>
  status ? `/ventas/pedidos?estado=${status}` : "/ventas/pedidos";

export function OrdersView({
  orders,
  status,
  display = { currency: "gs" },
}: {
  orders: OrderSummary[];
  /** Status filter in effect; undefined lists every order. */
  status?: OrderStatus;
  display?: CurrencyDisplay;
}) {
  const money = moneyFormatter(display.currency, display.exchangeRate);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pedidos"
        description="Pedidos enviados desde el carrito del catálogo, los pendientes primero."
      />

      <nav aria-label="Filtrar por estado" className={segmentedClass}>
        {FILTERS.map(([value, label]) => (
          <Link
            key={label}
            href={hrefFor(value)}
            aria-current={value === status ? "true" : undefined}
            className={segmentClass(value === status)}
          >
            {label}
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <p className="text-sm text-muted">
          {status ? EMPTY_FILTERED[status] : "Todavía no hay pedidos."}
        </p>
      ) : (
        <div className={table.wrapper}>
          <table className={table.root}>
            <thead className={table.head}>
              <tr>
                <th className={table.th}>Pedido</th>
                <th className={table.th}>Fecha</th>
                <th className={`${table.th} ${table.num}`}>Prendas</th>
                <th className={`${table.th} ${table.num}`}>Total</th>
                <th className={table.th}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className={table.row}>
                  <td className={`${table.td} font-medium`}>
                    <Link
                      href={`/ventas/pedidos/${order.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {formatOrderNumber(order.number)}
                    </Link>
                  </td>
                  <td className={table.td}>{formatDate(order.date)}</td>
                  <td className={`${table.td} ${table.num}`}>{order.lineCount}</td>
                  <td className={`${table.td} ${table.num}`}>{money(order.totalGs)}</td>
                  <td className={table.td}>
                    <OrderStatusBadge status={order.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
