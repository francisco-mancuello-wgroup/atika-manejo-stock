"use client";

import { Button, Input } from "@atika/ui";
import { useActionState } from "react";
import { IDLE } from "../lib/action-state";
import { GROUPS_LIST_HREF } from "../lib/catalog-groups/workspace";
import type { GroupDetail } from "../lib/queries/catalog-groups";
import { ConfirmDeleteButton } from "./confirm-delete-button";
import { Field, FormMessage } from "./form-controls";
import type { GroupActions } from "./group-actions";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border border-line bg-surface p-5">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{title}</h2>
      {children}
    </section>
  );
}

/** Name and window of the group; also the whole page while the group is being created. */
export function GroupDataCard({
  detail,
  action,
}: {
  detail: GroupDetail | null;
  action: GroupActions["saveGroup"];
}) {
  const [state, formAction, pending] = useActionState(action.bind(null, detail?.id ?? null), IDLE);
  const values = state.status === "error" ? state.values : undefined;
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  return (
    <Card title="DATOS DEL GRUPO">
      <form action={formAction} className="flex flex-col gap-4">
        <Field label="Nombre" htmlFor="group-name" error={errors.name}>
          <Input
            id="group-name"
            name="name"
            maxLength={80}
            defaultValue={values?.name ?? detail?.name ?? ""}
            aria-invalid={errors.name ? true : undefined}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Desde" htmlFor="group-starts" error={errors.startsAt}>
            <Input
              id="group-starts"
              name="startsAt"
              type="date"
              className="px-2"
              defaultValue={values?.startsAt ?? detail?.startsAt ?? ""}
            />
          </Field>
          <Field label="Hasta" htmlFor="group-ends" error={errors.endsAt}>
            <Input
              id="group-ends"
              name="endsAt"
              type="date"
              className="px-2"
              defaultValue={values?.endsAt ?? detail?.endsAt ?? ""}
            />
          </Field>
        </div>
        <p className="text-xs text-muted">Sin fechas, se ve mientras esté publicado.</p>
        <FormMessage state={state} />
        <div>
          <Button type="submit" disabled={pending}>
            {detail ? "Guardar datos" : "Crear grupo"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

/** What Libre, Asignado and Web mean. */
export function GroupHelpCard() {
  const rows: [string, string][] = [
    ["Libre", "Stock que no está en ningún grupo activo"],
    ["Asignado", "Lo que este grupo puede vender en la web"],
    ["Web", "Asignado − vendido, nunca más que el físico"],
  ];
  return (
    <Card title="CÓMO SE CUENTA">
      <dl className="flex flex-col gap-3 text-sm">
        {rows.map(([term, text]) => (
          <div key={term} className="flex flex-col">
            <dt className="font-medium text-ink">{term}</dt>
            <dd className="text-muted">{text}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

/** Delete: only while the group is not published. */
export function GroupDangerCard({
  detail,
  action,
}: {
  detail: GroupDetail;
  action: GroupActions["deleteGroup"];
}) {
  return (
    <Card title="ZONA DE RIESGO">
      {detail.isActive ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled
            aria-label={`Eliminar: ${detail.name}`}
            className="h-10 w-fit border border-line bg-surface px-4 text-sm font-medium text-warn opacity-50"
          >
            Eliminar grupo
          </button>
          <p className="text-xs text-muted">Despublicá el grupo para poder eliminarlo.</p>
        </div>
      ) : (
        <div className="[&>div]:items-start">
          <ConfirmDeleteButton
            id={detail.id}
            name={detail.name}
            noun="el grupo"
            action={action}
            redirectTo={GROUPS_LIST_HREF}
            variant="outlined"
          />
        </div>
      )}
    </Card>
  );
}
