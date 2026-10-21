"use client";

import { Button, Input } from "@atika/ui";
import { useActionState } from "react";
import { changePasswordAction } from "../app/(erp)/seguridad/actions";
import { IDLE } from "../lib/action-state";
import { Field, FormMessage } from "./form-controls";

const FIELDS = [
  { name: "currentPassword", label: "Contraseña actual", autoComplete: "current-password" },
  { name: "newPassword", label: "Nueva contraseña", autoComplete: "new-password" },
  { name: "confirmPassword", label: "Repetir nueva contraseña", autoComplete: "new-password" },
] as const;

export function ChangePasswordForm() {
  // React clears the uncontrolled inputs once the action settles, so nothing is kept after submit.
  const [state, formAction, pending] = useActionState(changePasswordAction, IDLE);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  return (
    <form action={formAction} className="flex flex-col gap-4 border border-line bg-surface p-5">
      {FIELDS.map((field) => (
        <Field key={field.name} label={field.label} htmlFor={field.name} error={errors[field.name]}>
          <Input
            id={field.name}
            name={field.name}
            type="password"
            autoComplete={field.autoComplete}
            required
            aria-invalid={errors[field.name] ? true : undefined}
            aria-describedby={errors[field.name] ? `${field.name}-error` : undefined}
          />
        </Field>
      ))}
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Cambiando…" : "Cambiar contraseña"}
      </Button>
    </form>
  );
}
