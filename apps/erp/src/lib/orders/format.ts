import type { OrderStatus } from "@atika/db";

/** `#0042`: the number the catalog puts in the customer's WhatsApp message. */
export function formatOrderNumber(number: number): string {
  return `#${String(number).padStart(4, "0")}`;
}

const LABELS: Record<OrderStatus, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
};

export function orderStatusLabel(status: OrderStatus): string {
  return LABELS[status];
}

export const ORDER_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const satisfies readonly OrderStatus[];

/** `?estado=approved` to a status; anything unknown (or absent) means "all". */
export function parseStatusFilter(
  searchParams: Record<string, string | string[] | undefined>,
): OrderStatus | undefined {
  const raw = searchParams.estado;
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  return ORDER_STATUSES.find((status) => status === value);
}
