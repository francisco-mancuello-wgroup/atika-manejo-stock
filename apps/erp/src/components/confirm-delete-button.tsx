"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FormState } from "../lib/action-state";

/** Deletes after a browser confirmation; shows a refusal below the button, else refreshes the list. */
export function ConfirmDeleteButton({
  id,
  name,
  noun,
  action,
  redirectTo,
}: {
  id: string;
  name: string;
  /** What is deleted, with its article: "el banco", "la promoción". */
  noun: string;
  action: (id: string) => Promise<FormState>;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        aria-label={`Eliminar: ${name}`}
        onClick={() => {
          if (!window.confirm(`¿Eliminar ${noun} "${name}"? No se puede deshacer.`)) return;
          startTransition(async () => {
            const state = await action(id);
            setError(state.status === "error" ? state.message : null);
            if (state.status !== "success") return;
            if (redirectTo) router.push(redirectTo);
            else router.refresh();
          });
        }}
        className="text-sm font-medium text-warn underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50"
      >
        Eliminar
      </button>
      {error ? (
        <span role="alert" className="max-w-xs text-right text-xs text-warn">
          {error}
        </span>
      ) : null}
    </div>
  );
}
