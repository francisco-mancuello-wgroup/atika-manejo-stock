import type { OrderStatus } from "@atika/db";
import { cn } from "@atika/ui";
import { orderStatusLabel } from "../lib/orders/format";

const TONES: Record<OrderStatus, string> = {
  pending: "bg-warnbg text-warn",
  approved: "bg-ok text-surface",
  rejected: "border border-line text-muted",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cn("inline-flex h-7 items-center px-3 text-xs font-medium", TONES[status])}>
      {orderStatusLabel(status)}
    </span>
  );
}
