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
    <div
      data-kpi
      className="@container flex min-w-0 flex-col gap-2 border border-line bg-surface p-5"
    >
      <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted">{label}</span>
      {/* Big amounts (₲ 382.763.000) shrink to fit narrow cards instead of spilling out */}
      <span className="font-display text-2xl [overflow-wrap:anywhere] text-ink @[15rem]:text-3xl">
        {value}
      </span>
      {detail ? <span className="text-xs text-muted">{detail}</span> : null}
    </div>
  );
}
