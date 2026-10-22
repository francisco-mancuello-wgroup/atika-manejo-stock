import { cn } from "@atika/ui";
import type { GroupKpis as Kpis } from "../lib/catalog-groups/matrix";

function Cell({
  label,
  value,
  hint,
  highlight = false,
}: {
  label: string;
  value: number;
  hint: string;
  highlight?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-1 px-5 py-4", highlight && "bg-subtle")}>
      <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
        {label}
      </span>
      <span className="font-display text-3xl tabular-nums text-ink">{value}</span>
      <span className="text-xs text-muted">{hint}</span>
    </div>
  );
}

/** Four totals of the group, from the saved quantities. */
export function GroupKpis({ kpis }: { kpis: Kpis }) {
  return (
    <div className="grid grid-cols-2 divide-x divide-y divide-line border border-line bg-surface sm:grid-cols-4 sm:divide-y-0">
      <Cell label="PRENDAS" value={kpis.products} hint={`${kpis.sizes} talles`} />
      <Cell label="ASIGNADAS" value={kpis.allocated} hint="unidades a la web" />
      <Cell label="VENDIDAS" value={kpis.sold} hint="desde que se activó" />
      <Cell label="LA WEB VE" value={kpis.remaining} hint="unidades disponibles" highlight />
    </div>
  );
}
