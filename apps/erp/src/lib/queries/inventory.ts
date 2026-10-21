import "server-only";
import { getDb } from "../db";
import type { InventoryFilters } from "../inventory-filters";
import { type InventoryProduct, toInventoryProduct } from "../view-models";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getInventory(filters: InventoryFilters): Promise<InventoryProduct[]> {
  const query = filters.query?.trim();
  const products = await getDb().product.findMany({
    where: {
      // An invalid id would make Postgres reject the uuid cast; treat it as "no filter".
      ...(filters.lotId && UUID.test(filters.lotId) ? { lotId: filters.lotId } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { code: { contains: query, mode: "insensitive" } },
              { color: { contains: query, mode: "insensitive" } },
              { brand: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ name: "asc" }],
    include: { lot: { select: { id: true, name: true } }, variants: true },
  });
  return products.map((product) => toInventoryProduct(product, product.lot));
}

export async function getLotOptions(): Promise<{ id: string; name: string }[]> {
  return getDb().lot.findMany({
    orderBy: { purchasedAt: "desc" },
    select: { id: true, name: true },
  });
}
