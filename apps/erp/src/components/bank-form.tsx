"use client";

import { Button, Input } from "@atika/ui";
import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";
import { type FormState, IDLE } from "../lib/action-state";
import { shrinkInputPhotos, tooBigToUpload } from "../lib/products/shrink-photos";
import type { BankSummary } from "../lib/queries/banks";
import { BankLogo } from "./bank-logo";
import { ConfirmDeleteButton } from "./confirm-delete-button";
import { Field, FormMessage } from "./form-controls";

export interface BankActions {
  /** `bankId` is null when creating. */
  save: (bankId: string | null, previous: FormState, formData: FormData) => Promise<FormState>;
  remove: (bankId: string) => Promise<FormState>;
}

/** Right pane of the banks tab: name and optional logo of one bank, with a preview of the logo. */
export function BankForm({
  bank,
  save,
  remove,
}: {
  /** Null while creating. */
  bank: BankSummary | null;
  save: BankActions["save"];
  remove?: { action: BankActions["remove"]; redirectTo: string };
}) {
  const [state, formAction, pending] = useActionState(save.bind(null, bank?.id ?? null), IDLE);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const [name, setName] = useState(bank?.name ?? "");
  const [removeLogo, setRemoveLogo] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  // The logo is shrunk in the browser before upload (Vercel caps requests at 4.5 MB)
  const [preparing, setPreparing] = useState(false);
  const [logoError, setLogoError] = useState<string | undefined>();
  const pick = useRef(0);

  // The object URL of the chosen file is released when it is replaced or the pane closes.
  useEffect(() => {
    return () => {
      if (chosen) URL.revokeObjectURL(chosen);
    };
  }, [chosen]);

  const savedLogo = removeLogo ? null : (bank?.logoUrl ?? null);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-8">
      <header className="flex items-start justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            {bank ? "Editar banco" : "Nuevo banco"}
          </p>
          <h2 className="font-display text-3xl text-ink">{bank?.name ?? "Nuevo banco"}</h2>
        </div>
        <div className="flex shrink-0 items-start gap-3">
          {remove && bank ? (
            <ConfirmDeleteButton
              id={bank.id}
              name={bank.name}
              noun="el banco"
              action={remove.action}
              redirectTo={remove.redirectTo}
              variant="outlined"
            />
          ) : null}
          <Button type="submit" disabled={pending || preparing || logoError !== undefined}>
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </header>

      <FormMessage state={state} />

      <Field label="Nombre" htmlFor="bank-name" error={errors.name}>
        <Input
          id="bank-name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "bank-name-error" : undefined}
        />
      </Field>

      <Field
        label="Logo"
        htmlFor="bank-logo"
        error={logoError ?? errors.logo}
        hint="Opcional. JPG, PNG o WebP; si no hay logo se muestra el nombre."
      >
        <input
          id="bank-logo"
          name="logo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="text-sm"
          onChange={async (event) => {
            const input = event.target;
            const file = input.files?.[0];
            setChosen(
              file && typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : null,
            );
            const current = ++pick.current;
            setPreparing(true);
            const files = await shrinkInputPhotos(input, () => current === pick.current);
            if (current !== pick.current) return;
            setLogoError(
              tooBigToUpload(files.map((logo) => logo.size))
                ? "El logo pesa demasiado: probá con uno más liviano."
                : undefined,
            );
            setPreparing(false);
          }}
        />
      </Field>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-ink">Vista previa</span>
        <div className="flex min-h-16 items-center border border-line bg-surface p-4">
          {chosen ? (
            <Image
              src={chosen}
              alt="Logo nuevo"
              width={64}
              height={32}
              unoptimized
              className="h-8 w-16 object-contain"
            />
          ) : savedLogo ? (
            <Image
              src={savedLogo}
              alt="Logo actual"
              width={64}
              height={32}
              sizes="64px"
              className="h-8 w-16 object-contain"
            />
          ) : (
            <BankLogo name={name.trim() || "Nombre del banco"} logoUrl={null} />
          )}
        </div>
      </div>

      {bank?.logoUrl ? (
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="removeLogo"
            checked={removeLogo}
            onChange={(event) => setRemoveLogo(event.target.checked)}
          />
          Quitar logo
        </label>
      ) : null}
    </form>
  );
}
