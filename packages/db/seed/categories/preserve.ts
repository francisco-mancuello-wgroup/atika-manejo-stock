import type { Prisma } from "../../src/index";
import { type Preserved, productKeys } from "./choices";

/**
 * Publication state, category, lookbook placement of every stored product, keyed like `productKeys`. Read before
 * the reload deletes the products, in import (id) order so identical products keep their place.
 */
export async function readPreserved(tx: Prisma.TransactionClient): Promise<Map<string, Preserved>> {
  const rows = await tx.product.findMany({
    orderBy: { id: "asc" },
    select: {
      name: true,
      code: true,
      isPublished: true,
      category: true,
      catalog: true,
      catalogOrder: true,
      catalogSection: true,
      catalogName: true,
      inPink: true,
      lot: { select: { name: true } },
    },
  });
  const byLot = new Map<string, typeof rows>();
  for (const row of rows) byLot.set(row.lot.name, [...(byLot.get(row.lot.name) ?? []), row]);

  const preserved = new Map<string, Preserved>();
  for (const [lotName, products] of byLot) {
    for (const [i, key] of productKeys(lotName, products).entries()) {
      const row = products[i];
      if (!row) continue;
      preserved.set(key, {
        isPublished: row.isPublished,
        category: row.category,
        lookbook: {
          catalog: row.catalog,
          catalogOrder: row.catalogOrder,
          catalogSection: row.catalogSection,
          catalogName: row.catalogName,
          inPink: row.inPink,
        },
      });
    }
  }
  return preserved;
}
