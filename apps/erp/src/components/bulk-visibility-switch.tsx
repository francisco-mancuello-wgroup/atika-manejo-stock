"use client";

import { Button, Switch } from "@atika/ui";
import { useEffect, useId, useOptimistic, useRef, useState, useTransition } from "react";
import type { FormState } from "../lib/action-state";

/**
 * Header toggle that shows or hides every product of the current (filtered) list at once.
 * Both ways ask first, since they change what the web shows for the whole list.
 */
export function BulkVisibilitySwitch({
  productIds,
  allVisible,
  action,
}: {
  productIds: string[];
  allVisible: boolean;
  action: (productIds: string[], isPublished: boolean) => Promise<FormState>;
}) {
  const [checked, setChecked] = useOptimistic(allVisible);
  const [error, setError] = useState<string | null>(null);
  // The visibility waiting for confirmation (null: no dialog)
  const [confirming, setConfirming] = useState<boolean | null>(null);
  const [pending, startTransition] = useTransition();
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirming !== null) cancelRef.current?.focus();
  }, [confirming]);

  const apply = (next: boolean) =>
    startTransition(async () => {
      setChecked(next);
      const state = await action(productIds, next);
      setError(state.status === "error" ? state.message : null);
      setConfirming(null);
    });

  const count = productIds.length;
  const verb = confirming ? "Mostrar" : "Ocultar";
  const title =
    count === 1
      ? `¿${verb} el producto de la lista?`
      : `¿${verb} los ${count} productos de la lista?`;
  const detail = confirming
    ? "Pasan a verse en la web, con el stock que tengan."
    : "Dejan de verse en la web. Los que estén en un grupo activo se siguen mostrando con el grupo.";

  return (
    <div className="flex flex-col items-start gap-1">
      <Switch
        checked={checked}
        aria-label="Visibles: todos los de la lista"
        onCheckedChange={(next) => setConfirming(next)}
      />
      {error ? (
        <span role="alert" className="text-xs normal-case tracking-normal text-warn">
          {error}
        </span>
      ) : null}
      {confirming !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 normal-case tracking-normal">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onKeyDown={(event) => {
              if (event.key === "Escape" && !pending) setConfirming(null);
            }}
            className="flex w-full max-w-md flex-col gap-4 border border-line bg-bg p-6 text-left font-normal shadow-lg"
          >
            <h2 id={titleId} className="font-display text-xl text-ink">
              {title}
            </h2>
            <p className="text-sm text-muted">{detail}</p>
            <div className="flex justify-end gap-3">
              <Button
                ref={cancelRef}
                variant="secondary"
                disabled={pending}
                onClick={() => setConfirming(null)}
              >
                Cancelar
              </Button>
              <button
                type="button"
                disabled={pending}
                onClick={() => apply(confirming)}
                className="h-10 bg-warn px-4 text-sm font-medium text-surface hover:bg-warn/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50"
              >
                {pending ? (confirming ? "Mostrando…" : "Ocultando…") : verb}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
