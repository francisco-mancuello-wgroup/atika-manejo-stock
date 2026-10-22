import "server-only";
import type { OrderStatus, Prisma } from "@atika/db";
import { todayIso } from "../dates";
import { getDb } from "../db";

/** Any Prisma client or transaction (lets tests read inside a rolled back transaction). */
type Reader = Pick<Prisma.TransactionClient, "order">;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface OrderSummary {
  id: string;
  number: number;
  /** Asunción calendar day it was placed, `yyyy-mm-dd`. */
  date: string;
  status: OrderStatus;
  lineCount: number;
  totalGs: number;
}

export interface OrderLine {
  id: string;
  productId: string;
  productName: string;
  size: string;
  color: string | null;
  quantity: number;
  unitPriceGs: number;
  discountPercent: number | null;
  subtotalGs: number;
  /** Units in stock today (not reserved by the order). */
  stock: number;
}

export interface OrderDetail {
  id: string;
  number: number;
  date: string;
  status: OrderStatus;
  /** Day it was approved or rejected, null while pending. */
  decidedDate: string | null;
  totalGs: number;
  items: OrderLine[];
}

const summarySelect = {
  id: true,
  number: true,
  createdAt: true,
  status: true,
  items: { select: { quantity: true, unitPriceGs: true } },
} satisfies Prisma.OrderSelect;

type SummaryRow = Prisma.OrderGetPayload<{ select: typeof summarySelect }>;

function toSummary(row: SummaryRow): OrderSummary {
  return {
    id: row.id,
    number: row.number,
    date: todayIso(row.createdAt),
    status: row.status,
    lineCount: row.items.length,
    totalGs: row.items.reduce((sum, item) => sum + item.quantity * item.unitPriceGs, 0),
  };
}

const newestFirst = [{ createdAt: "desc" }, { number: "desc" }] as const;

/** How many decided orders the list shows; pending ones are always all there. */
const DECIDED_LIMIT = 200;

/** Pending orders first (all of them, newest first), then the decided ones newest first. */
export async function getOrders(
  db: Reader = getDb(),
  status?: OrderStatus,
): Promise<OrderSummary[]> {
  const pending =
    !status || status === "pending"
      ? await db.order.findMany({
          where: { status: "pending" },
          orderBy: [...newestFirst],
          select: summarySelect,
        })
      : [];
  const decided =
    status === "pending"
      ? []
      : await db.order.findMany({
          where: status ? { status } : { status: { not: "pending" } },
          orderBy: [...newestFirst],
          take: DECIDED_LIMIT,
          select: summarySelect,
        });
  return [...pending, ...decided].map(toSummary);
}

/** One order with each line's current stock, or null (unknown or malformed id). */
export async function getOrderDetail(
  id: string,
  db: Reader = getDb(),
): Promise<OrderDetail | null> {
  if (!UUID.test(id)) return null;
  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: [{ productName: "asc" }, { size: "asc" }, { id: "asc" }],
        include: { variant: { select: { productId: true, stock: true } } },
      },
    },
  });
  if (!order) return null;
  const items = order.items.map((item) => ({
    id: item.id,
    productId: item.variant.productId,
    productName: item.productName,
    size: item.size,
    color: item.color,
    quantity: item.quantity,
    unitPriceGs: item.unitPriceGs,
    discountPercent: item.discountPercent,
    subtotalGs: item.quantity * item.unitPriceGs,
    stock: item.variant.stock,
  }));
  return {
    id: order.id,
    number: order.number,
    date: todayIso(order.createdAt),
    status: order.status,
    decidedDate: order.decidedAt ? todayIso(order.decidedAt) : null,
    totalGs: items.reduce((sum, item) => sum + item.subtotalGs, 0),
    items,
  };
}
