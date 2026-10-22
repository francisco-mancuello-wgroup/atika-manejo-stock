import { SaleForm } from "../../../components/sale-form";
import { VentasView } from "../../../components/ventas-view";
import { todayIso } from "../../../lib/dates";
import { getCurrencyDisplay } from "../../../lib/display-currency";
import { getSales, getSellableProducts } from "../../../lib/queries/sales";
import { registerSaleAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function VentasPage() {
  const [sales, products, display] = await Promise.all([
    getSales(),
    getSellableProducts(),
    getCurrencyDisplay(),
  ]);
  return (
    <VentasView sales={sales} display={display}>
      <SaleForm products={products} today={todayIso()} action={registerSaleAction} />
    </VentasView>
  );
}
