import { notFound } from "next/navigation";
import { OrderDetailView } from "../../../../../components/order-detail-view";
import { getCurrencyDisplay } from "../../../../../lib/display-currency";
import { getOrderDetail } from "../../../../../lib/queries/orders";

export const dynamic = "force-dynamic";

export default async function PedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderDetail(id);
  if (!order) notFound();
  const display = await getCurrencyDisplay();
  return <OrderDetailView order={order} display={display} />;
}
