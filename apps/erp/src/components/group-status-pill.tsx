import { cn } from "@atika/ui";
import { dayMonth, type GroupStatus } from "../lib/catalog-groups/format";

/** Where the group stands on the web: on, scheduled, expired or not published. */
export function GroupStatusPill({
  status,
  startsAt,
}: {
  status: GroupStatus;
  startsAt: string | null;
}) {
  const [label, tone] =
    status === "Activo"
      ? (["En la web", "bg-ok text-surface"] as const)
      : status === "Programado"
        ? ([
            `Programado${startsAt ? ` · desde ${dayMonth(startsAt)}` : ""}`,
            "bg-subtle text-ink",
          ] as const)
        : status === "Vencido"
          ? (["Vencido", "bg-warnbg text-warn"] as const)
          : (["No publicado", "border border-line text-muted"] as const);
  return (
    <span className={cn("inline-flex h-7 items-center px-3 text-xs font-medium", tone)}>
      {label}
    </span>
  );
}
