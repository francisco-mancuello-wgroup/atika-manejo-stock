"use client";

import { Switch } from "@atika/ui";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import type { FormState } from "../lib/action-state";

function errorOf(state: FormState): string | null {
  return state.status === "error" ? state.message : null;
}

function ErrorText({ message }: { message: string | null }) {
  return message ? (
    <span role="alert" className="text-xs text-warn">
      {message}
    </span>
  ) : null;
}

/** Active toggle: applies at once (optimistic) and falls back to the saved value on failure. */
export function DiscountActiveSwitch({
  discountId,
  name,
  isActive,
  action,
}: {
  discountId: string;
  name: string;
  isActive: boolean;
  action: (discountId: string, isActive: boolean) => Promise<FormState>;
}) {
  const [checked, setChecked] = useOptimistic(isActive);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-start gap-1">
      <Switch
        checked={checked}
        aria-label={`Activo: ${name}`}
        onCheckedChange={(next) =>
          startTransition(async () => {
            setChecked(next);
            setError(errorOf(await action(discountId, next)));
          })
        }
      />
      <ErrorText message={error} />
    </div>
  );
}

/** Deletes after a browser confirmation; goes to `redirectTo` or refreshes the list. */
export function DeleteDiscountButton({
  discountId,
  name,
  action,
  redirectTo,
}: {
  discountId: string;
  name: string;
  action: (discountId: string) => Promise<FormState>;
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
          if (!window.confirm(`¿Eliminar el descuento "${name}"? No se puede deshacer.`)) return;
          startTransition(async () => {
            const state = await action(discountId);
            setError(errorOf(state));
            if (state.status !== "success") return;
            if (redirectTo) router.push(redirectTo);
            else router.refresh();
          });
        }}
        className="text-sm font-medium text-warn underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50"
      >
        Eliminar
      </button>
      <ErrorText message={error} />
    </div>
  );
}
