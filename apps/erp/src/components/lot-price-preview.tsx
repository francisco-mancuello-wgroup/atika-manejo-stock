"use client";

import { cn } from "@atika/ui";
import { useState } from "react";
import type { CurrencyDisplay } from "../lib/currency";
import { formatUsd, moneyFormatter } from "../lib/format";
import { type PreviewLot, previewLot } from "../lib/settings/preview";
import { Field, Select } from "./form-controls";
import { table } from "./styles";

/** Lot-by-lot result of applying the values currently typed in the settings form. */
export function LotPricePreview({
  lots,
  values,
  display = { currency: "gs" },
}: {
  lots: PreviewLot[];
  values: Record<string, string>;
  display?: CurrencyDisplay;
}) {
  const [open, setOpen] = useState(false);
  const [lotId, setLotId] = useState<string | undefined>(lots[0]?.id);
  const lot = lots.find((candidate) => candidate.id === lotId) ?? lots[0];
  const money = moneyFormatter(display.currency, display.exchangeRate);
  const preview = lot ? previewLot(values, lot) : null;

  return (
    <section className="flex flex-col gap-4 border border-line bg-surface p-5">
      <h2 className="font-display text-2xl text-ink">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="lot-price-preview"
          onClick={() => setOpen((current) => !current)}
          className="flex w-full items-center justify-between gap-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Ver cálculo por lote
          <span
            aria-hidden="true"
            className={cn("text-base text-muted transition-transform", open && "rotate-180")}
          >
            ▾
          </span>
        </button>
      </h2>
      {!open ? (
        <p className="-mt-2 text-sm text-muted">
          Compará, prenda por prenda, el precio actual con el que resulta de los valores tipeados.
        </p>
      ) : lot === undefined ? (
        <p id="lot-price-preview" className="text-sm text-muted">
          Todavía no hay lotes.
        </p>
      ) : (
        <div id="lot-price-preview" className="flex flex-col gap-4">
          <div className="w-full max-w-xs">
            <Field label="Lote" htmlFor="preview-lot">
              <Select
                id="preview-lot"
                value={lot.id}
                onChange={(event) => setLotId(event.target.value)}
              >
                {lots.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {preview?.status === "invalid" ? (
            <p className="text-sm text-muted">Completá los parámetros para ver el cálculo.</p>
          ) : preview?.status === "empty" ? (
            <p className="text-sm text-muted">Este lote no tiene unidades compradas.</p>
          ) : preview?.status === "ok" ? (
            <div className={table.wrapper}>
              <table aria-label="Cálculo por lote" className={table.root}>
                <thead className={table.head}>
                  <tr>
                    <th className={table.th}>Producto</th>
                    <th className={`${table.th} ${table.num}`}>Unidades compradas</th>
                    <th className={`${table.th} ${table.num}`}>Valor original (US$)</th>
                    <th className={`${table.th} ${table.num}`}>Envío por unidad (US$)</th>
                    <th className={`${table.th} ${table.num}`}>Costo unitario (US$)</th>
                    <th className={`${table.th} ${table.num}`}>Precio actual</th>
                    <th className={`${table.th} ${table.num}`}>Precio nuevo</th>
                    <th className={`${table.th} ${table.num}`}>Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr key={row.id} className={table.row}>
                      <td className={cn(table.td, "font-medium")}>{row.name}</td>
                      <td className={`${table.td} ${table.num}`}>{row.units}</td>
                      <td className={`${table.td} ${table.num}`}>
                        {formatUsd(row.originalValueUsd)}
                      </td>
                      <td className={`${table.td} ${table.num}`}>
                        {formatUsd(row.shippingPerUnitUsd)}
                      </td>
                      <td className={`${table.td} ${table.num}`}>{formatUsd(row.unitCostUsd)}</td>
                      <td className={`${table.td} ${table.num}`}>{money(row.currentPriceGs)}</td>
                      <td className={cn(table.td, table.num, "font-medium")}>
                        {money(row.newPriceGs)}
                      </td>
                      <td
                        className={cn(
                          table.td,
                          table.num,
                          row.differenceGs < 0 ? "text-warn" : "text-muted",
                        )}
                      >
                        {row.differenceGs > 0 ? "+" : ""}
                        {money(row.differenceGs)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
