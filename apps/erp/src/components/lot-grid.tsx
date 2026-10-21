import { cn } from "@atika/ui";
import { formatGs, formatUsd } from "../lib/format";
import type { LotGridRow } from "../lib/view-models";
import { table } from "./styles";

export function LotGrid({ sizes, rows }: { sizes: string[]; rows: LotGridRow[] }) {
  return (
    <div className={table.wrapper}>
      <table className={table.root}>
        <thead className={table.head}>
          <tr>
            <th className={table.th}>Modelo</th>
            {sizes.map((size) => (
              <th key={size} className={cn(table.th, "text-center")}>
                {size}
              </th>
            ))}
            <th className={cn(table.th, table.num)}>Valor original (US$)</th>
            <th className={cn(table.th, table.num)}>Costo unit. (US$)</th>
            <th className={cn(table.th, table.num)}>Precio (₲)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={table.row}>
              <td className={table.td}>
                <div className="flex flex-col">
                  <span className="font-medium">{row.name}</span>
                  {row.code ? <span className="text-xs text-muted">{row.code}</span> : null}
                </div>
              </td>
              {sizes.map((size) => {
                const cell = row.cells[size];
                if (!cell) {
                  return (
                    <td key={size} className={cn(table.td, "text-center text-muted")}>
                      –
                    </td>
                  );
                }
                const soldOut = cell.stock === 0;
                return (
                  <td
                    key={size}
                    className={cn(
                      table.td,
                      "text-center tabular-nums",
                      soldOut && "bg-warnbg text-warn",
                    )}
                  >
                    {cell.stock}
                  </td>
                );
              })}
              <td className={cn(table.td, table.num)}>{formatUsd(row.originalValueUsd)}</td>
              <td className={cn(table.td, table.num)}>{formatUsd(row.unitCostUsd)}</td>
              <td className={cn(table.td, table.num)}>{formatGs(row.priceGs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
