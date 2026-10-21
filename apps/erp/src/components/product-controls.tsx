"use client";

import { CATALOG_CATEGORIES } from "@atika/db/categories";
import { Switch } from "@atika/ui";
import { useOptimistic, useState, useTransition } from "react";
import type { FormState } from "../lib/action-state";
import { Select } from "./form-controls";

function errorOf(state: FormState): string | null {
  return state.status === "error" ? state.message : null;
}

/** Visible toggle: applies at once (optimistic) and falls back to the saved value on failure. */
export function VisibilitySwitch({
  productId,
  name,
  isPublished,
  action,
}: {
  productId: string;
  name: string;
  isPublished: boolean;
  action: (productId: string, isPublished: boolean) => Promise<FormState>;
}) {
  const [checked, setChecked] = useOptimistic(isPublished);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-start gap-1">
      <Switch
        checked={checked}
        aria-label={`Visible: ${name}`}
        onCheckedChange={(next) =>
          startTransition(async () => {
            setChecked(next);
            setError(errorOf(await action(productId, next)));
          })
        }
      />
      {error ? (
        <span role="alert" className="text-xs text-warn">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function CategorySelect({
  productId,
  name,
  category,
  action,
}: {
  productId: string;
  name: string;
  category: string | null;
  action: (productId: string, category: string) => Promise<FormState>;
}) {
  const [value, setValue] = useOptimistic(category ?? "");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-1">
      <Select
        aria-label={`Categoría: ${name}`}
        value={value}
        className="h-8 min-w-40"
        onChange={(event) => {
          const next = event.target.value;
          startTransition(async () => {
            setValue(next);
            setError(errorOf(await action(productId, next)));
          });
        }}
      >
        <option value="">Sin categoría</option>
        {CATALOG_CATEGORIES.map((item) => (
          <option key={item.slug} value={item.slug}>
            {item.label}
          </option>
        ))}
      </Select>
      {error ? (
        <span role="alert" className="text-xs text-warn">
          {error}
        </span>
      ) : null}
    </div>
  );
}
