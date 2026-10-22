"use client";

import { Button } from "@atika/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FormState } from "../lib/action-state";
import { formatOrderNumber } from "../lib/orders/format";

export interface OrderDecisionActions {
  approve: (orderId: string) => Promise<FormState>;
  reject: (orderId: string) => Promise<FormState>;
}

/** Aprobar / Rechazar of a pending order: confirms, runs once, shows why a decision failed. */
export function OrderDecision({
  orderId,
  number,
  approve,
  reject,
}: { orderId: string; number: number } & OrderDecisionActions) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const label = formatOrderNumber(number);

  const decide = (action: (orderId: string) => Promise<FormState>, question: string) => {
    if (pending || !window.confirm(question)) return;
    startTransition(async () => {
      const state = await action(orderId);
      setError(state.status === "error" ? state.message : null);
      // The order is no longer pending after any answer but a plain failure; reload it.
      if (state.status === "success") router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-3">
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            decide(
              approve,
              `¿Aprobar el pedido ${label}? Se registra una venta por cada prenda y se descuenta el stock.`,
            )
          }
        >
          Aprobar
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            decide(reject, `¿Rechazar el pedido ${label}? No se registra ninguna venta.`)
          }
        >
          Rechazar
        </Button>
      </div>
      {error ? (
        <span role="alert" className="max-w-md text-right text-sm text-warn">
          {error}
        </span>
      ) : null}
    </div>
  );
}
