/** Shared class names for the plain data tables (square corners, hairline borders). */
export const table = {
  wrapper: "relative overflow-x-auto border border-line bg-surface",
  root: "w-full border-collapse text-sm",
  head: "border-b border-line bg-subtle text-left text-[11px] font-medium uppercase tracking-[0.12em] text-muted",
  th: "px-4 py-3 font-medium",
  row: "border-b border-line last:border-b-0",
  td: "px-4 py-3 align-middle text-ink",
  num: "text-right tabular-nums",
} as const;
