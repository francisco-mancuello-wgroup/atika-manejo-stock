import { InventarioView } from "../../components/inventario-view";
import { parseInventoryFilters } from "../../lib/inventory-filters";
import { getInventory, getLotOptions } from "../../lib/queries/inventory";

export const dynamic = "force-dynamic";

export default async function InventarioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseInventoryFilters(await searchParams);
  const [products, lots] = await Promise.all([getInventory(filters), getLotOptions()]);
  return <InventarioView products={products} lots={lots} filters={filters} />;
}
