"use client";

import { Button, Input } from "@atika/ui";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { type FormState, IDLE } from "../lib/action-state";
import type { BankSummary } from "../lib/queries/banks";
import { ConfirmDeleteButton } from "./confirm-delete-button";
import { Field, FormMessage } from "./form-controls";
import { table } from "./styles";

export interface BankActions {
  /** `bankId` is null when creating. */
  save: (bankId: string | null, previous: FormState, formData: FormData) => Promise<FormState>;
  remove: (bankId: string) => Promise<FormState>;
}

function BankForm({
  bank,
  save,
  onDone,
}: {
  bank: BankSummary | null;
  save: BankActions["save"];
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(save.bind(null, bank?.id ?? null), IDLE);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const values = state.status === "error" ? (state.values ?? {}) : {};

  useEffect(() => {
    if (state.status !== "success") return;
    router.refresh();
    onDone();
  }, [state, router, onDone]);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-4 bg-subtle p-5 md:grid-cols-2">
      <Field label="Nombre" htmlFor="bank-name" error={errors.name}>
        <Input
          id="bank-name"
          name="name"
          defaultValue={values.name ?? bank?.name ?? ""}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "bank-name-error" : undefined}
        />
      </Field>
      <Field
        label="Logo"
        htmlFor="bank-logo"
        error={errors.logo}
        hint="Opcional. JPG, PNG o WebP; si no hay logo se muestra el nombre."
      >
        <input
          id="bank-logo"
          name="logo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="text-sm"
        />
      </Field>
      {bank?.logoUrl ? (
        <label className="flex items-center gap-2 text-sm text-ink md:col-span-2">
          <input type="checkbox" name="removeLogo" />
          Quitar logo
        </label>
      ) : null}
      <div className="flex flex-col gap-3 md:col-span-2">
        <FormMessage state={state} />
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : "Guardar"}
          </Button>
          <button
            type="button"
            onClick={onDone}
            className="text-sm text-muted underline-offset-4 hover:underline"
          >
            Cancelar
          </button>
        </div>
      </div>
    </form>
  );
}

function usage(count: number): string {
  if (count === 0) return "Sin promociones";
  return `${count} ${count === 1 ? "promoción" : "promociones"}`;
}

/** Banks list with inline create and edit: name and optional logo. */
export function BanksView({ banks, actions }: { banks: BankSummary[]; actions: BankActions }) {
  // "new", a bank id, or null when no form is open.
  const [editing, setEditing] = useState<string | null>(null);
  const close = () => setEditing(null);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-2xl text-ink">Bancos</h2>
          <p className="text-sm text-muted">
            Los bancos y tarjetas que aparecen en las promociones, con su logo.
          </p>
        </div>
        {editing === "new" ? null : (
          <Button type="button" variant="secondary" onClick={() => setEditing("new")}>
            Nuevo banco
          </Button>
        )}
      </div>

      {editing === "new" ? <BankForm bank={null} save={actions.save} onDone={close} /> : null}

      {banks.length === 0 ? (
        <p className="text-sm text-muted">Todavía no cargaste bancos.</p>
      ) : (
        <div className={table.wrapper}>
          <table className={table.root}>
            <thead className={table.head}>
              <tr>
                <th className={table.th}>Banco</th>
                <th className={table.th}>Promociones</th>
                <th className={table.th}>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {banks.map((bank) => (
                <tr key={bank.id} className={table.row}>
                  <td className={table.td}>
                    {editing === bank.id ? (
                      <BankForm bank={bank} save={actions.save} onDone={close} />
                    ) : (
                      <div className="flex items-center gap-3">
                        {bank.logoUrl ? (
                          <Image
                            src={bank.logoUrl}
                            alt={bank.name}
                            width={64}
                            height={32}
                            sizes="64px"
                            className="h-8 w-16 object-contain"
                          />
                        ) : null}
                        <span className="font-medium">{bank.name}</span>
                      </div>
                    )}
                  </td>
                  <td className={`${table.td} text-muted`}>{usage(bank.promoCount)}</td>
                  <td className={table.td}>
                    <div className="flex items-center justify-end gap-4">
                      <button
                        type="button"
                        aria-label={`Editar: ${bank.name}`}
                        onClick={() => setEditing(bank.id)}
                        className="text-sm font-medium text-ink underline-offset-4 hover:underline"
                      >
                        Editar
                      </button>
                      <ConfirmDeleteButton
                        id={bank.id}
                        name={bank.name}
                        noun="el banco"
                        action={actions.remove}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
