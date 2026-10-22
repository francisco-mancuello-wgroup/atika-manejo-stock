import Link from "next/link";
import type { FormState } from "../lib/action-state";
import { formatDate, formatGs, formatInteger, formatUsd } from "../lib/format";
import type { LotDetail } from "../lib/view-models";
import { KpiCard } from "./kpi-card";
import { LotGrid } from "./lot-grid";
import { LotShippingForm } from "./lot-shipping-form";
import { PageHeader } from "./page-header";

const NUMBER = new Intl.NumberFormat("es-PY", { maximumFractionDigits: 4 });

type Action = (previous: FormState, formData: FormData) => Promise<FormState>;

export function LotDetailView({ lot, action }: { lot: LotDetail; action: Action }) {
  const { summary, params } = lot;
  const pricing = [
    ["Tipo de cambio (₲ / US$)", NUMBER.format(params.exchangeRate)],
    ["Factor de venta", NUMBER.format(params.saleFactor)],
    ["IVA (%)", NUMBER.format(params.vatPercent)],
    ["Costo sobre valor original (%)", NUMBER.format(params.costPercent)],
  ] as const;
  return (
    <div className="flex flex-col gap-6">
      <Link href="/compras" className="text-sm text-muted underline-offset-4 hover:underline">
        ← Compras
      </Link>
      <PageHeader
        title={lot.name}
        description={`${lot.supplier} · comprado el ${formatDate(lot.purchasedAt)}`}
      />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          label="Stock"
          value={formatInteger(summary.stock)}
          detail={`de ${formatInteger(summary.unitsBought)} compradas`}
        />
        <KpiCard label="Vendidas" value={formatInteger(summary.unitsSold)} />
        <KpiCard
          label="Inversión"
          value={formatGs(summary.investmentGs)}
          detail={formatUsd(summary.investmentUsd)}
        />
        <KpiCard
          label="Stock valorizado"
          value={formatGs(summary.stockValueGs)}
          detail="a precio de lista"
        />
      </div>
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1fr_320px]">
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-2xl text-ink">Stock por modelo y talle</h2>
          {lot.rows.length === 0 ? (
            <p className="text-sm text-muted">Este lote no tiene productos.</p>
          ) : (
            <LotGrid sizes={lot.sizes} rows={lot.rows} />
          )}
        </section>
        <div className="flex flex-col gap-6">
          <section
            aria-labelledby="lot-pricing-title"
            className="flex flex-col gap-4 border border-line bg-surface p-5"
          >
            <h2 id="lot-pricing-title" className="font-display text-2xl text-ink">
              Precios del lote
            </h2>
            <dl className="flex flex-col gap-2 text-sm">
              {pricing.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            <Link href="/parametros" className="text-sm text-ink underline underline-offset-4">
              Editar en Parámetros
            </Link>
          </section>
          <LotShippingForm totalShippingUsd={lot.params.totalShippingUsd} action={action} />
        </div>
      </div>
    </div>
  );
}
