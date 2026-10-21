import "server-only";
import { getDb } from "../db";
import { sortSizes } from "../sizes";
import { type SaleRow, toSaleRow } from "../view-models";

const saleInclude = {
  variant: { select: { size: true, product: { select: { id: true, name: true } } } },
} as const;

const newestFirst = [{ soldAt: "desc" }, { createdAt: "desc" }] as const;

export async function getSales(limit = 200): Promise<SaleRow[]> {
  const sales = await getDb().sale.findMany({
    orderBy: [...newestFirst],
    take: limit,
    include: saleInclude,
  });
  return sales.map(toSaleRow);
}

export async function getLatestSales(limit = 5): Promise<SaleRow[]> {
  return getSales(limit);
}

export async function getMonthSalesTotalGs(monthStart: Date): Promise<number> {
  const sales = await getDb().sale.findMany({
    where: { soldAt: { gte: monthStart } },
    select: { quantity: true, listPriceGs: true, chargedGs: true },
  });
  return sales.reduce(
    (total, sale) => total + (sale.chargedGs ?? sale.listPriceGs) * sale.quantity,
    0,
  );
}

export interface SellableProduct {
  id: string;
  label: string;
  priceGs: number;
  sizes: { size: string; stock: number }[];
}

/** Products with at least one size in stock, for the sale form. */
export async function getSellableProducts(): Promise<SellableProduct[]> {
  const products = await getDb().product.findMany({
    where: { variants: { some: { stock: { gt: 0 } } } },
    orderBy: [{ name: "asc" }],
    include: { lot: { select: { name: true } }, variants: { where: { stock: { gt: 0 } } } },
  });
  return products.map((product) => {
    const order = sortSizes(product.variants.map((v) => v.size));
    return {
      id: product.id,
      label: `${product.name} · ${product.lot.name}`,
      priceGs: product.priceGs,
      sizes: product.variants
        .map((v) => ({ size: v.size, stock: v.stock }))
        .sort((a, b) => order.indexOf(a.size) - order.indexOf(b.size)),
    };
  });
}
