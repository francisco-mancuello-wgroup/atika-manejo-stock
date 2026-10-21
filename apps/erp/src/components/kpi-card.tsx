import type { ReactNode } from "react";

export function KpiCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div data-kpi className="flex flex-col gap-2 border border-line bg-surface p-5">
      <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted">{label}</span>
      <span className="font-display text-3xl text-ink">{value}</span>
      {detail ? <span className="text-xs text-muted">{detail}</span> : null}
    </div>
  );
}
