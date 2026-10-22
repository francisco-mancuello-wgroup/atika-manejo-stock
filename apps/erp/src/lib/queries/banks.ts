import type { Prisma } from "@atika/db";

/** Any Prisma client or transaction (lets tests read inside a rolled back transaction). */
type Reader = Pick<Prisma.TransactionClient, "bank">;

export interface BankSummary {
  id: string;
  name: string;
  logoUrl: string | null;
  /** Promos that list this bank. */
  promoCount: number;
}

export async function getBankList(db: Reader): Promise<BankSummary[]> {
  const rows = await db.bank.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { promos: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    logoUrl: row.logoUrl,
    promoCount: row._count.promos,
  }));
}
