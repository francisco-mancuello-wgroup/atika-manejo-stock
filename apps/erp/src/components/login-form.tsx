"use client";

import { Button, Input } from "@atika/ui";
import { useActionState } from "react";
import { loginAction } from "../app/login/actions";
import { IDLE } from "../lib/action-state";
import { Field, FormMessage } from "./form-controls";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, IDLE);
  const email = state.status === "error" ? (state.values?.email ?? "") : "";
  return (
    <form action={formAction} className="flex flex-col gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={email}
          key={email}
        />
      </Field>
      <Field label="Contraseña" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>
      <FormMessage state={state} />
      <Button type="submit" size="lg" disabled={pending}>
        Ingresar
      </Button>
    </form>
  );
}
