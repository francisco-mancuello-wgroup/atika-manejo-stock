import { SaleForm } from "../../../components/sale-form";
import { VentasView } from "../../../components/ventas-view";
import { todayIso } from "../../../lib/dates";
import { getSales, getSellableProducts } from "../../../lib/queries/sales";
import { registerSaleAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function VentasPage() {
  const [sales, products] = await Promise.all([getSales(), getSellableProducts()]);
  return (
    <VentasView sales={sales}>
      <SaleForm products={products} today={todayIso()} action={registerSaleAction} />
    </VentasView>
  );
}
