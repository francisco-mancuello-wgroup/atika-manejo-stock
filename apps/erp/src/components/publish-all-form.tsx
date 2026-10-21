"use client";

import { Button } from "@atika/ui";
import { useActionState } from "react";
import { type FormState, IDLE } from "../lib/action-state";
import { FormMessage } from "./form-controls";

export function PublishAllForm({
  action,
}: {
  action: (previous: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  return (
    <form action={formAction} className="flex flex-col items-end gap-2">
      <Button type="submit" disabled={pending}>
        {pending ? "Publicando…" : "Publicar todos con stock"}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
