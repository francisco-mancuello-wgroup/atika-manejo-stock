"use client";

import { Switch } from "@atika/ui";
import { useOptimistic, useState, useTransition } from "react";
import type { FormState } from "../lib/action-state";

/** On/off switch of a group (or a brand, with its own `label`): applies at once and shows the domain refusal if it can't switch. */
export function GroupSwitch({
  groupId,
  name,
  isActive,
  action,
  label,
}: {
  groupId: string;
  name: string;
  isActive: boolean;
  action: (groupId: string, active: boolean) => Promise<FormState>;
  /** Accessible name of the switch; defaults to "Activo: <name>". */
  label?: string;
}) {
  const [checked, setChecked] = useOptimistic(isActive);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-start gap-1">
      <Switch
        checked={checked}
        aria-label={label ?? `Activo: ${name}`}
        onCheckedChange={(next) =>
          startTransition(async () => {
            setChecked(next);
            const state = await action(groupId, next);
            setError(state.status === "error" ? state.message : null);
          })
        }
      />
      {error ? (
        <span role="alert" className="max-w-56 text-xs text-warn">
          {error}
        </span>
      ) : null}
    </div>
  );
}
