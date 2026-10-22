import { OrdersView } from "../../../../components/orders-view";
import { getCurrencyDisplay } from "../../../../lib/display-currency";
import { parseStatusFilter } from "../../../../lib/orders/format";
import { getOrders } from "../../../../lib/queries/orders";

export const dynamic = "force-dynamic";

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const status = parseStatusFilter(await searchParams);
  const [orders, display] = await Promise.all([getOrders(undefined, status), getCurrencyDisplay()]);
  return <OrdersView orders={orders} status={status} display={display} />;
}
