"use client";

import { cn, Input } from "@atika/ui";
import { useId, useState } from "react";
import type { CurrencyDisplay } from "../lib/currency";
import { formatUsd, moneyFormatter } from "../lib/format";
import type { LotGridRow } from "../lib/view-models";
import { ProductThumb } from "./product-thumb";
import { table } from "./styles";

/** Lowercase without accents, so "ambar" finds "Ámbar". */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/** Every word of the query must appear in the model's name or code. */
function matches(row: LotGridRow, query: string): boolean {
  const text = normalize(`${row.name} ${row.code ?? ""}`);
  return normalize(query)
    .split(/\s+/)
    .every((word) => text.includes(word));
}

export function LotGrid({
  sizes,
  rows,
  display = { currency: "gs" },
}: {
  sizes: string[];
  rows: LotGridRow[];
  display?: CurrencyDisplay;
}) {
  const money = moneyFormatter(display.currency, display.exchangeRate);
  const [query, setQuery] = useState("");
  const searchId = useId();
  const visible = query.trim() ? rows.filter((row) => matches(row, query)) : rows;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex w-80 flex-col gap-1.5">
          <label htmlFor={searchId} className="text-xs font-medium text-ink">
            Buscar en la compra
          </label>
          <Input
            id={searchId}
            type="search"
            placeholder="Nombre o código"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        {query.trim() ? (
          <p className="pb-2.5 text-sm text-muted">{`${visible.length} de ${rows.length} modelos`}</p>
        ) : null}
      </div>
      {visible.length === 0 ? (
        <p className="text-sm text-muted">Ningún modelo coincide con la búsqueda.</p>
      ) : (
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
                <th
                  className={cn(table.th, table.num)}
                >{`Precio (${display.currency === "usd" ? "US$" : "₲"})`}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id} className={table.row}>
                  <td className={table.td}>
                    <div className="flex items-center gap-3">
                      <ProductThumb src={row.imageUrl} name={row.name} />
                      <div className="flex flex-col">
                        <span className="font-medium">{row.name}</span>
                        {row.code ? <span className="text-xs text-muted">{row.code}</span> : null}
                      </div>
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
                  <td className={cn(table.td, table.num)}>{money(row.priceGs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
