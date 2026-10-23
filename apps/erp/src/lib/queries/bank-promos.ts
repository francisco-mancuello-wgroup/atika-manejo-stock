import type { Prisma } from "@atika/db";
import { toIsoDate } from "../dates";

/** Any Prisma client or transaction (lets tests read inside a rolled back transaction). */
type Reader = Pick<Prisma.TransactionClient, "bankPromo" | "lot">;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PromoBankRef {
  id: string;
  name: string;
  logoUrl: string | null;
}

export interface BankPromoSummary {
  id: string;
  /** Null on promos created before they had a name. */
  name: string | null;
  kind: "installments" | "refund" | "discount";
  value: number;
  /** ISO weekdays; empty = every day. */
  days: number[];
  capGs: number | null;
  isActive: boolean;
  scope: "all" | "lots" | "products";
  /** `yyyy-mm-dd`, or null when the window has no start. */
  startsAt: string | null;
  endsAt: string | null;
  lotCount: number;
  productCount: number;
  banks: PromoBankRef[];
}

export interface BankPromoDetail
  extends Omit<BankPromoSummary, "lotCount" | "productCount" | "banks"> {
  terms: string | null;
  bankIds: string[];
  lotIds: string[];
  productIds: string[];
}

export interface LotOption {
  id: string;
  name: string;
  productCount: number;
}

const dateOrNull = (date: Date | null) => (date ? toIsoDate(date) : null);

export async function getBankPromoList(db: Pick<Reader, "bankPromo">): Promise<BankPromoSummary[]> {
  const rows = await db.bankPromo.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      banks: { include: { bank: true } },
      _count: { select: { lots: true, products: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    kind: row.kind,
    value: row.value,
    days: row.days,
    capGs: row.capGs,
    isActive: row.isActive,
    scope: row.scope,
    startsAt: dateOrNull(row.startsAt),
    endsAt: dateOrNull(row.endsAt),
    lotCount: row._count.lots,
    productCount: row._count.products,
    banks: row.banks
      .map(({ bank }) => ({ id: bank.id, name: bank.name, logoUrl: bank.logoUrl }))
      .sort((a, b) => a.name.localeCompare(b.name, "es")),
  }));
}

export async function getBankPromoForEdit(
  db: Pick<Reader, "bankPromo">,
  id: string,
): Promise<BankPromoDetail | null> {
  if (!UUID.test(id)) return null;
  const row = await db.bankPromo.findUnique({
    where: { id },
    include: { banks: true, lots: true, products: true },
  });
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    value: row.value,
    days: row.days,
    capGs: row.capGs,
    isActive: row.isActive,
    scope: row.scope,
    startsAt: dateOrNull(row.startsAt),
    endsAt: dateOrNull(row.endsAt),
    terms: row.terms,
    bankIds: row.banks.map((bank) => bank.bankId),
    lotIds: row.lots.map((lot) => lot.lotId),
    productIds: row.products.map((product) => product.productId),
  };
}

/** Every lot, newest first, for the "Lotes" checklist of the promo form. */
export async function getLotOptions(db: Pick<Reader, "lot">): Promise<LotOption[]> {
  const rows = await db.lot.findMany({
    orderBy: { purchasedAt: "desc" },
    select: { id: true, name: true, _count: { select: { products: true } } },
  });
  return rows.map((row) => ({ id: row.id, name: row.name, productCount: row._count.products }));
}
