import type { PromoPreview } from "../lib/bank-promos/workspace";
import { BankLogo } from "./bank-logo";

export const EMPTY_PREVIEW_MESSAGE =
  "Completá el beneficio y elegí al menos un banco para ver la vista previa.";

/**
 * "Así lo ve el cliente": the catalog's bank promos block (same grouped headlines, bank logos and
 * terms link) for the values being typed, plus where and when it applies.
 */
export function BankPromoPreview({ preview }: { preview: PromoPreview | null }) {
  return (
    <section aria-label="Así lo ve el cliente" className="flex flex-col gap-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
        Así lo ve el cliente
      </p>
      {preview ? (
        <>
          <div className="flex flex-col gap-3 border border-line bg-surface p-4">
            <h3 className="font-display text-xl text-ink">Nuestras promociones bancarias</h3>
            <ul className="flex flex-col gap-3">
              {preview.groups.map((group) => (
                <li key={group.headline} className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-ink">{group.headline}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {group.banks.map((bank) => (
                      <BankLogo key={bank.id} name={bank.name} logoUrl={bank.logoUrl} />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
            <span className="self-start text-xs text-muted underline underline-offset-4">
              Ver bases y condiciones →
            </span>
          </div>
          <p className="text-xs text-muted">{preview.note}</p>
        </>
      ) : (
        <p className="border border-dashed border-line p-4 text-sm text-muted">
          {EMPTY_PREVIEW_MESSAGE}
        </p>
      )}
    </section>
  );
}
