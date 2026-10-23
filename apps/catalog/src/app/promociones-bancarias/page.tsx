import type { Metadata } from "next";
import Link from "next/link";
import { BankBadge } from "../../components/bank-promos-block";
import { formatPromoWindow } from "../../lib/bank-promos";
import { getDb } from "../../lib/db";
import { getCatalogSettings, listPublicBankPromos } from "../../lib/queries";

// Promos, their dates and the weekday change from the ERP at any time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Promociones bancarias · Átika" };

/** `/promociones-bancarias`: bases y condiciones of every promo that is live today. */
export default async function PromosBancariasPage() {
  const db = getDb();
  const promos = await listPublicBankPromos(db, await getCatalogSettings(db));
  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col gap-8 px-6 py-10 sm:px-10">
      <Link
        href="/"
        className="self-start text-xs tracking-[2px] text-fg-muted uppercase underline-offset-4 hover:text-foreground hover:underline"
      >
        ← Catálogos
      </Link>
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-[34px] leading-tight">Promociones bancarias</h1>
        <p className="text-sm text-fg-muted">
          Beneficios con tarjetas de bancos para tus compras. Cada promo tiene sus fechas, días y
          condiciones.
        </p>
      </header>

      {promos.length === 0 ? (
        <p className="text-sm text-fg-muted">Por ahora no hay promociones bancarias vigentes.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {promos.map((promo) => (
            <article
              key={promo.id}
              className="flex flex-col gap-4 border border-border bg-surface p-5"
            >
              <div className="flex flex-col gap-1">
                <h2 className="font-heading text-2xl leading-tight">
                  {promo.name ?? promo.headline}
                </h2>
                {promo.name ? <p className="text-sm text-fg-muted">{promo.headline}</p> : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {promo.banks.map((bank) => (
                  <BankBadge key={bank.id} bank={bank} />
                ))}
              </div>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
                <dt className="text-fg-muted">Vigencia</dt>
                <dd>{formatPromoWindow(promo.startsAt, promo.endsAt)}</dd>
                <dt className="text-fg-muted">Aplica a</dt>
                <dd>
                  {promo.appliesTo === "all" ? "Todos los productos" : "Productos seleccionados"}
                </dd>
              </dl>
              {promo.terms ? (
                <p className="text-sm leading-relaxed whitespace-pre-line text-fg-muted">
                  {promo.terms}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
