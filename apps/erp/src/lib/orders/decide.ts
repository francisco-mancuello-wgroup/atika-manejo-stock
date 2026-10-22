import type { OrderStatus, Prisma } from "@atika/db";
import type { FormState } from "../action-state";
import { todayIso } from "../dates";
import { registerSale, type SaleTx } from "../sales/register";
import { formatOrderNumber } from "./format";

type Tx = SaleTx & Pick<Prisma.TransactionClient, "order">;

/** The slice of the Prisma client the decisions need (lets tests reuse a rolled back tx). */
export interface OrderRunner {
  $transaction<R>(fn: (tx: Tx) => Promise<R>): Promise<R>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The line that stopped an approval. */
export interface ShortLine {
  productName: string;
  size: string;
  quantity: number;
  available: number;
}

export type ApproveResult =
  | { ok: true; number: number; salesCount: number; lotIds: string[] }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "already_decided"; number: number; status: OrderStatus }
  | { ok: false; reason: "out_of_stock"; number: number; line: ShortLine }
  | { ok: false; reason: "variant_not_found"; number: number; line: ShortLine };

export type RejectResult =
  | { ok: true; number: number }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "already_decided"; number: number; status: OrderStatus };

/** Thrown inside the transaction to roll everything back; carries what to tell the user. */
class Abort extends Error {
  constructor(readonly result: Extract<ApproveResult, { ok: false }>) {
    super(result.reason);
  }
}

/**
 * Takes the decision on a pending order. The conditional update is the guard: it only matches a
 * pending order, so a double click or two people deciding at once can never decide it twice (the
 * second waits for the row lock, then finds it no longer pending and matches nothing).
 */
async function claim(
  tx: Pick<Prisma.TransactionClient, "order">,
  id: string,
  status: "approved" | "rejected",
  now: Date,
): Promise<
  | { ok: true; number: number }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "already_decided"; number: number; status: OrderStatus }
> {
  if (!UUID.test(id)) return { ok: false, reason: "not_found" };
  const claimed = await tx.order.updateMany({
    where: { id, status: "pending" },
    data: { status, decidedAt: now },
  });
  const order = await tx.order.findUnique({
    where: { id },
    select: { number: true, status: true },
  });
  if (!order) return { ok: false, reason: "not_found" };
  if (claimed.count === 0) {
    return { ok: false, reason: "already_decided", number: order.number, status: order.status };
  }
  return { ok: true, number: order.number };
}

/**
 * Approves a pending order: one sale per line through `registerSale` (stock decrement, group
 * consumption), charged at the order's price and linked to the order. All or nothing: when any
 * line lacks stock the whole transaction is rolled back and the failing line is reported.
 */
export async function approveOrder(
  db: OrderRunner,
  id: string,
  now: Date = new Date(),
): Promise<ApproveResult> {
  try {
    return await db.$transaction(async (tx) => {
      const claimed = await claim(tx, id, "approved", now);
      if (!claimed.ok) return claimed;
      const items = await tx.order.findUniqueOrThrow({ where: { id } }).items({
        orderBy: [{ productName: "asc" }, { size: "asc" }, { id: "asc" }],
        include: { variant: { select: { productId: true } } },
      });
      const soldAt = todayIso(now);
      const lotIds = new Set<string>();
      for (const item of items) {
        const line = {
          productName: item.productName,
          size: item.size,
          quantity: item.quantity,
        };
        const sale = await registerSale(
          tx,
          {
            productId: item.variant.productId,
            size: item.size,
            quantity: item.quantity,
            soldAt,
            chargedGs: item.unitPriceGs,
            customer: undefined,
            notes: undefined,
          },
          now,
          { orderId: id },
        );
        if (!sale.ok) {
          const available = sale.reason === "out_of_stock" ? sale.available : 0;
          throw new Abort({
            ok: false,
            reason: sale.reason === "out_of_stock" ? "out_of_stock" : "variant_not_found",
            number: claimed.number,
            line: { ...line, available },
          });
        }
        lotIds.add(sale.lotId);
      }
      return {
        ok: true as const,
        number: claimed.number,
        salesCount: items.length,
        lotIds: [...lotIds],
      };
    });
  } catch (error) {
    if (error instanceof Abort) return error.result;
    throw error;
  }
}

/** Rejects a pending order. Stock is untouched: pending orders never reserved any. */
export async function rejectOrder(
  db: Pick<OrderRunner, "$transaction">,
  id: string,
  now: Date = new Date(),
): Promise<RejectResult> {
  return db.$transaction((tx) => claim(tx, id, "rejected", now));
}

const DECIDED_AS: Record<OrderStatus, string> = {
  pending: "está pendiente",
  approved: "ya fue aprobado",
  rejected: "ya fue rechazado",
};

const NOT_FOUND: FormState = { status: "error", message: "No se encontró el pedido." };

function alreadyDecided(number: number, status: OrderStatus): FormState {
  return {
    status: "error",
    message: `El pedido ${formatOrderNumber(number)} ${DECIDED_AS[status]}.`,
  };
}

/** What the ERP shows after an approval attempt. */
export function approveState(result: ApproveResult): FormState {
  if (result.ok) {
    const sold =
      result.salesCount === 1
        ? "se registró 1 venta"
        : `se registraron ${result.salesCount} ventas`;
    return {
      status: "success",
      message: `Pedido ${formatOrderNumber(result.number)} aprobado: ${sold}.`,
    };
  }
  if (result.reason === "not_found") return NOT_FOUND;
  if (result.reason === "already_decided") return alreadyDecided(result.number, result.status);
  const { productName, size, quantity, available } = result.line;
  const left = available === 0 ? "no queda stock" : `quedan ${available}`;
  const why =
    result.reason === "out_of_stock"
      ? `de "${productName}" talle ${size} piden ${quantity} y ${left}`
      : `"${productName}" ya no tiene el talle ${size}`;
  return {
    status: "error",
    message: `No se aprobó el pedido ${formatOrderNumber(result.number)}: ${why}. No se registró ninguna venta.`,
  };
}

/** What the ERP shows after a rejection attempt. */
export function rejectState(result: RejectResult): FormState {
  if (result.ok) {
    return { status: "success", message: `Pedido ${formatOrderNumber(result.number)} rechazado.` };
  }
  if (result.reason === "not_found") return NOT_FOUND;
  return alreadyDecided(result.number, result.status);
}
