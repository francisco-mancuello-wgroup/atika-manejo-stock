"use client";

import { Switch } from "@atika/ui";
import { useOptimistic, useState, useTransition } from "react";
import type { FormState } from "../lib/action-state";

/** Header toggle that shows or hides every product of the current (filtered) list at once. */
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
  const [, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-start gap-1">
      <Switch
        checked={checked}
        aria-label="Visibles: todos los de la lista"
        onCheckedChange={(next) =>
          startTransition(async () => {
            setChecked(next);
            const state = await action(productIds, next);
            setError(state.status === "error" ? state.message : null);
          })
        }
      />
      {error ? (
        <span role="alert" className="text-xs normal-case tracking-normal text-warn">
          {error}
        </span>
      ) : null}
    </div>
  );
}
