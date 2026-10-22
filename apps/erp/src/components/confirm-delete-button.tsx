"use client";

import { cn } from "@atika/ui";
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
  variant = "link",
}: {
  id: string;
  name: string;
  /** What is deleted, with its article: "el banco", "la promoción". */
  noun: string;
  action: (id: string) => Promise<FormState>;
  redirectTo?: string;
  /** "outlined" is the boxed button used in detail panes; "link" is the inline one of tables. */
  variant?: "link" | "outlined";
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
        className={cn(
          "text-sm font-medium text-warn focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50",
          variant === "outlined"
            ? "h-10 border border-line bg-surface px-4 hover:bg-subtle"
            : "underline-offset-4 hover:underline",
        )}
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
