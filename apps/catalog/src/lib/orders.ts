import "server-only";
import type { PrismaClient } from "@atika/db";
import { effectivePriceGs } from "./price";
import { type CatalogDb, getCatalogSettings, getProductDetail } from "./queries";
import { activeGroupWhere } from "./web-stock";

/** Abuse limits: a real cart is a handful of pieces, so these are generous but bounded. */
export const MAX_LINES = 20;
export const MAX_QUANTITY = 10;

/** The slice of the Prisma client an order needs (a rolled back transaction works too). */
export type OrderDb = CatalogDb & Pick<PrismaClient, "order" | "productVariant">;

export type CreateOrderResult =
  | { ok: true; id: string; number: number }
  | {
      ok: false;
      reason: "empty" | "too_many_lines" | "invalid_line" | "unavailable" | "prices_hidden";
    };

interface Line {
  productId: string;
  size: string;
  quantity: number;
}

/** Validates the untrusted payload and merges repeated lines of the same piece and size. */
function parseLines(
  input: unknown,
):
  | { ok: true; lines: Line[] }
  | { ok: false; reason: "empty" | "too_many_lines" | "invalid_line" } {
  if (!Array.isArray(input) || input.length === 0) return { ok: false, reason: "empty" };
  if (input.length > MAX_LINES) return { ok: false, reason: "too_many_lines" };
  const merged = new Map<string, Line>();
  for (const raw of input as unknown[]) {
    const line = (raw ?? {}) as Partial<Record<keyof Line, unknown>>;
    const { productId, size, quantity } = line;
    if (typeof productId !== "string" || typeof size !== "string" || !size.trim()) {
      return { ok: false, reason: "invalid_line" };
    }
    if (!Number.isInteger(quantity) || (quantity as number) < 1) {
      return { ok: false, reason: "invalid_line" };
    }
    const key = `${productId}|${size}`;
    const total = (merged.get(key)?.quantity ?? 0) + (quantity as number);
    if (total > MAX_QUANTITY) return { ok: false, reason: "invalid_line" };
    merged.set(key, { productId, size, quantity: total });
  }
  return { ok: true, lines: [...merged.values()] };
}

/**
 * Saves a web order. The client only says which piece, size and how many: names and prices are read
 * here with the same catalog queries the pages use (discounts included), so a tampered cart can't
 * change what is charged. Any line that is not on the web today (unknown, hidden, size missing or
 * sold out for the web) rejects the whole order, so what is saved always matches what the customer
 * saw. Stock is never written: approving the order in the ERP is what sells the pieces.
 */
export async function createOrder(
  db: OrderDb,
  input: unknown,
  now: Date = new Date(),
): Promise<CreateOrderResult> {
  const parsed = parseLines(input);
  if (!parsed.ok) return parsed;

  const settings = await getCatalogSettings(db);
  if (!settings.showPrices) return { ok: false, reason: "prices_hidden" };

  const productIds = [...new Set(parsed.lines.map((line) => line.productId))];
  const details = new Map<string, NonNullable<Awaited<ReturnType<typeof getProductDetail>>>>();
  for (const id of productIds) {
    const detail = await getProductDetail(db, settings, id, now);
    if (detail) details.set(id, detail);
  }

  // An unknown product rejects before any further query (a malformed id would abort a transaction).
  if (productIds.some((id) => !details.has(id))) return { ok: false, reason: "unavailable" };

  const variants = await db.productVariant.findMany({
    where: { productId: { in: productIds } },
    select: {
      id: true,
      productId: true,
      size: true,
      // The Pink event price of the size, when the active group sets one
      allocations: {
        where: { group: activeGroupWhere(now), priceGs: { not: null } },
        select: { priceGs: true },
      },
    },
  });
  const variantOf = (productId: string, size: string) =>
    variants.find((variant) => variant.productId === productId && variant.size === size);

  const items = [];
  for (const line of parsed.lines) {
    const detail = details.get(line.productId);
    const variant = variantOf(line.productId, line.size);
    const id = variant?.id;
    // The event price is final, as on the Pink page: no catalog discount on top of it
    const eventPrice = variant?.allocations[0]?.priceGs ?? null;
    const price = eventPrice ?? (detail ? effectivePriceGs(detail) : null);
    const onWeb = detail?.sizes.some((entry) => entry.size === line.size && entry.available);
    if (!detail || !id || !onWeb || price === null) return { ok: false, reason: "unavailable" };
    items.push({
      variantId: id,
      quantity: line.quantity,
      unitPriceGs: price,
      discountPercent: eventPrice === null ? detail.discountPercent : null,
      productName: detail.name,
      size: line.size,
      color: detail.color,
    });
  }

  const order = await db.order.create({
    data: { items: { create: items } },
    select: { id: true, number: true },
  });
  return { ok: true, id: order.id, number: order.number };
}
