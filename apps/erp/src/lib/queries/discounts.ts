import type { Prisma } from "@atika/db";
import type { DiscountRule } from "@atika/pricing";
import { coverUrl } from "../cover";
import { toIsoDate } from "../dates";

/** Any Prisma client or transaction (lets tests read inside a rolled back transaction). */
type Reader = Pick<Prisma.TransactionClient, "discount" | "product">;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface DiscountSummary {
  id: string;
  name: string;
  percent: number;
  isActive: boolean;
  scope: "all" | "selected";
  /** `yyyy-mm-dd`, or null when the window has no start. */
  startsAt: string | null;
  endsAt: string | null;
  productCount: number;
}

export interface DiscountDetail extends Omit<DiscountSummary, "productCount"> {
  productIds: string[];
}

export interface PickerProduct {
  id: string;
  name: string;
  lotId: string;
  lotName: string;
  category: string | null;
  priceGs: number;
  imageUrl: string | null;
}

export async function getDiscountList(db: Reader): Promise<DiscountSummary[]> {
  const rows = await db.discount.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { products: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    percent: row.percent,
    isActive: row.isActive,
    scope: row.scope,
    startsAt: row.startsAt ? toIsoDate(row.startsAt) : null,
    endsAt: row.endsAt ? toIsoDate(row.endsAt) : null,
    productCount: row._count.products,
  }));
}

export async function getDiscountForEdit(db: Reader, id: string): Promise<DiscountDetail | null> {
  if (!UUID.test(id)) return null;
  const row = await db.discount.findUnique({ where: { id }, include: { products: true } });
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    percent: row.percent,
    isActive: row.isActive,
    scope: row.scope,
    startsAt: row.startsAt ? toIsoDate(row.startsAt) : null,
    endsAt: row.endsAt ? toIsoDate(row.endsAt) : null,
    productIds: row.products.map((product) => product.productId),
  };
}

/** Every product, for the "Seleccionar productos" picker (filtered on the client). */
export async function getPickerProducts(db: Reader): Promise<PickerProduct[]> {
  const products = await db.product.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      category: true,
      priceGs: true,
      lotId: true,
      lot: { select: { name: true } },
      images: { select: { url: true, position: true } },
    },
  });
  return products.map((product) => ({
    id: product.id,
    name: product.name,
    lotId: product.lotId,
    lotName: product.lot.name,
    category: product.category,
    priceGs: product.priceGs,
    imageUrl: coverUrl(product.images),
  }));
}

/** Active discounts as pricing rules; the date window is judged by `effectiveDiscount`. */
export async function getActiveDiscountRules(
  db: Pick<Reader, "discount">,
): Promise<DiscountRule[]> {
  const rows = await db.discount.findMany({
    where: { isActive: true },
    include: { products: { select: { productId: true } } },
  });
  return rows.map((row) => ({
    percent: row.percent,
    isActive: row.isActive,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    scope: row.scope,
    productIds: row.products.map((product) => product.productId),
  }));
}
