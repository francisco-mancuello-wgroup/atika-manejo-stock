"use client";

import { useState } from "react";
import type { PaymentDetailsView } from "../lib/catalog-view";
import { AtikaWordmark } from "./lookbook/wordmark";

const ROWS = [
  { key: "holderName", label: "Razón Social" },
  { key: "bank", label: "Banco" },
  { key: "accountGs", label: "Cta. Gs" },
  { key: "accountUsd", label: "Cta. US$" },
  { key: "ruc", label: "RUC" },
] as const;

/** Copies `text` and says so on the button for a moment. */
function CopyButton({ text, label, children }: { text: string; label: string; children: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      onClick={async () => {
        await navigator.clipboard?.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }}
      className="inline-flex min-h-11 min-w-20 shrink-0 items-center justify-center border border-foreground/30 px-3 text-xs tracking-[1.5px] uppercase transition-colors hover:border-foreground hover:bg-hover"
    >
      {copied ? "Copiado" : children}
    </button>
  );
}

/**
 * The bank details to pay by transfer, like the printed card: the Átika logo, "Datos Bancarios"
 * and one row per detail, each with its own copy button (plus one to copy everything). The QR
 * printed from the ERP opens this page, so the details can change without reprinting it.
 */
export function PaymentDetails({ details }: { details: PaymentDetailsView | null }) {
  return (
    <section
      aria-labelledby="payment-heading"
      className="mx-auto flex w-full max-w-xl flex-col items-center gap-10 px-6 py-14"
    >
      <AtikaWordmark className="h-auto w-[140px]" />
      <h1 id="payment-heading" className="font-heading text-[36px] tracking-[2px] sm:text-[44px]">
        Datos Bancarios
      </h1>
      {details ? (
        <>
          <ul className="flex w-full flex-col">
            {ROWS.map((row) => (
              <li
                key={row.key}
                className="flex items-center justify-between gap-4 border-b border-border py-3"
              >
                <div className="flex min-w-0 flex-col sm:flex-row sm:items-baseline sm:gap-3">
                  <span className="font-heading text-lg text-fg-muted sm:w-40">{row.label}:</span>
                  <span className="font-heading text-xl break-all">{details[row.key]}</span>
                </div>
                <CopyButton text={details[row.key]} label={`Copiar ${row.label}`}>
                  Copiar
                </CopyButton>
              </li>
            ))}
          </ul>
          <CopyButton
            text={ROWS.map((row) => `${row.label}: ${details[row.key]}`).join("\n")}
            label="Copiar todos los datos"
          >
            Copiar todos los datos
          </CopyButton>
        </>
      ) : (
        <p className="text-center text-fg-muted">
          Muy pronto vas a encontrar acá los datos bancarios.
        </p>
      )}
    </section>
  );
}
