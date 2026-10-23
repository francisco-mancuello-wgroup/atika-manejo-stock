"use client";

import { Button } from "@atika/ui";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import type { FormState } from "../lib/action-state";
import type { DeletionBlock } from "../lib/products/delete";

const BLOCK_REASON: Record<DeletionBlock, string> = {
  sales: "No se puede eliminar porque tiene ventas: las ventas conservan su historial.",
  orders: "No se puede eliminar porque tiene pedidos: los pedidos conservan su historial.",
};

/**
 * Danger button under the product form (or, `compact`, in an inventory row). Disabled with the
 * reason when sales or orders reference the product; otherwise it asks for confirmation. On
 * success the action redirects to the inventory.
 */
export function DeleteProductButton({
  productId,
  name,
  block,
  action,
  compact = false,
}: {
  productId: string;
  name: string;
  block: DeletionBlock | null;
  action: (productId: string) => Promise<FormState>;
  /** Small text button for a table row; the reason is announced and shown on hover. */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const titleId = useId();
  const reasonId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
    setError(null);
    triggerRef.current?.focus();
  };

  return (
    <div
      className={
        compact
          ? "relative z-10 inline-flex"
          : "flex flex-col items-start gap-2 border-t border-line pt-6"
      }
    >
      <button
        ref={triggerRef}
        type="button"
        disabled={block !== null}
        aria-label={compact ? `Eliminar ${name}` : undefined}
        aria-describedby={block ? reasonId : undefined}
        title={compact && block ? BLOCK_REASON[block] : undefined}
        onClick={() => setOpen(true)}
        className={
          compact
            ? "text-sm text-warn underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
            : "h-10 border border-warn bg-surface px-4 text-sm font-medium text-warn hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-surface"
        }
      >
        {compact ? "Eliminar" : "Eliminar producto"}
      </button>
      {block ? (
        <p id={reasonId} className={compact ? "sr-only" : "text-sm text-muted"}>
          {BLOCK_REASON[block]}
        </p>
      ) : null}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onKeyDown={(event) => {
              if (event.key === "Escape" && !pending) close();
            }}
            className="flex w-full max-w-md flex-col gap-4 border border-line bg-bg p-6 shadow-lg"
          >
            <h2 id={titleId} className="font-display text-xl text-ink">
              {`¿Eliminar «${name}»? Esta acción no se puede deshacer.`}
            </h2>
            {error ? (
              <p role="alert" className="text-sm text-warn">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-3">
              <Button ref={cancelRef} variant="secondary" disabled={pending} onClick={close}>
                Cancelar
              </Button>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const state = await action(productId);
                    if (state.status === "error") setError(state.message);
                  })
                }
                className="h-10 bg-warn px-4 text-sm font-medium text-surface hover:bg-warn/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50"
              >
                {pending ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
