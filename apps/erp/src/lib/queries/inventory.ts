import "server-only";
import { getDb } from "../db";
import type { InventoryFilters } from "../inventory-filters";
import { blockFromCounts } from "../products/delete";
import { type InventoryProduct, toInventoryProduct } from "../view-models";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const sumOf = <T>(rows: readonly T[], pick: (row: T) => number) =>
  rows.reduce((total, row) => total + pick(row), 0);

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
              // A scanner types the whole code: only an exact match, never a partial one.
              { variants: { some: { barcode: { equals: query, mode: "insensitive" } } } },
            ],
          }
        : {}),
    },
    orderBy: [{ name: "asc" }],
    include: {
      lot: { select: { id: true, name: true } },
      variants: {
        include: {
          _count: {
            select: { sales: true, orderItems: true, allocations: { where: { sold: { gt: 0 } } } },
          },
        },
      },
      images: { select: { url: true, position: true }, orderBy: { position: "asc" }, take: 1 },
    },
  });
  return products.map((product) =>
    toInventoryProduct(
      product,
      product.lot,
      blockFromCounts({
        sales: sumOf(product.variants, (v) => v._count.sales),
        sold: sumOf(product.variants, (v) => v._count.allocations),
        orders: sumOf(product.variants, (v) => v._count.orderItems),
      }),
    ),
  );
}

export async function getLotOptions(): Promise<{ id: string; name: string }[]> {
  return getDb().lot.findMany({
    orderBy: { purchasedAt: "desc" },
    select: { id: true, name: true },
  });
}
