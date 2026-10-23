import { cn, Skeleton } from "@atika/ui";
import type { ReactNode } from "react";
import { table } from "./styles";

/**
 * Loading region: announced once to assistive technology, while the skeleton
 * blocks inside stay hidden from it. Mirrors the root `div` of the real views.
 */
function LoadingRegion({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={cn("flex flex-col gap-6", className)}
    >
      <span className="sr-only">Cargando…</span>
      {children}
    </div>
  );
}

/** Same footprint as `PageHeader`: a title line and a description line. */
function HeaderSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-4 w-80 max-w-full" />
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="flex flex-col gap-3 border border-line bg-surface p-5">
      <Skeleton className="h-2.5 w-24" />
      <Skeleton className="h-8 w-32" />
    </div>
  );
}

function TableBlock({ columns, rows }: { columns: number; rows: number }) {
  return (
    <div className={table.wrapper}>
      <table className={table.root}>
        <thead className={table.head}>
          <tr>
            {Array.from({ length: columns }, (_, column) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders never reorder
              <th key={column} className={table.th}>
                <Skeleton className="h-3 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, row) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders never reorder
            <tr key={row} className={table.row}>
              {Array.from({ length: columns }, (_, column) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders never reorder
                <td key={column} className={table.td}>
                  <Skeleton className={cn("h-4", column === 0 ? "w-40" : "w-20")} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** List screens: header, optional filter bar, row count and a table. */
export function TableSkeleton({
  columns = 5,
  rows = 8,
  filters = false,
}: {
  columns?: number;
  rows?: number;
  filters?: boolean;
}) {
  return (
    <LoadingRegion>
      <HeaderSkeleton />
      {filters ? (
        <div className="flex flex-wrap items-end gap-4 border border-line bg-surface p-4">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-10 w-80 max-w-full" />
          <Skeleton className="h-10 w-24" />
        </div>
      ) : null}
      <Skeleton className="h-4 w-24" />
      <TableBlock columns={columns} rows={rows} />
    </LoadingRegion>
  );
}

/** Detail screens: back link, header, KPI cards, then a main panel beside a side card. */
export function DetailSkeleton() {
  return (
    <LoadingRegion>
      <Skeleton className="h-4 w-24" />
      <HeaderSkeleton />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, card) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders never reorder
          <KpiSkeleton key={card} />
        ))}
      </div>
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <TableBlock columns={5} rows={6} />
        <Skeleton className="h-64 w-full" />
      </div>
    </LoadingRegion>
  );
}

/** Form screens: header and a stack of labelled fields with a submit button. */
export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <LoadingRegion>
      <HeaderSkeleton />
      <div className="flex max-w-2xl flex-col gap-5 border border-line bg-surface p-6">
        {Array.from({ length: fields }, (_, field) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders never reorder
          <div key={field} className="flex flex-col gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <Skeleton className="h-10 w-32" />
      </div>
    </LoadingRegion>
  );
}

/** Dashboard: header, a row of KPI cards and a table section. */
export function DashboardSkeleton() {
  return (
    <LoadingRegion className="gap-8">
      <HeaderSkeleton />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, card) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders never reorder
          <KpiSkeleton key={card} />
        ))}
      </div>
      <section className="flex flex-col gap-3">
        <Skeleton className="h-7 w-48" />
        <TableBlock columns={6} rows={4} />
      </section>
      <section className="flex flex-col gap-3">
        <Skeleton className="h-7 w-40" />
        <TableBlock columns={4} rows={4} />
      </section>
    </LoadingRegion>
  );
}
