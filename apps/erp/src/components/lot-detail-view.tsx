import Link from "next/link";
import type { FormState } from "../lib/action-state";
import type { CurrencyDisplay } from "../lib/currency";
import { formatDate, formatInteger, moneyFormatter, moneyPair } from "../lib/format";
import type { AppSettingsView } from "../lib/queries/settings";
import type { LotDetail } from "../lib/view-models";
import { KpiCard } from "./kpi-card";
import { LotGrid } from "./lot-grid";
import { LotPricingPanel } from "./lot-pricing-panel";
import { LotShippingForm } from "./lot-shipping-form";
import { PageHeader } from "./page-header";

type Action = (previous: FormState, formData: FormData) => Promise<FormState>;

export function LotDetailView({
  lot,
  settings,
  action,
  paramsAction,
  modeAction,
  display = { currency: "gs" },
}: {
  lot: LotDetail;
  /** Global values from Parámetros, to flag what a lot with its own parameters changes. */
  settings: AppSettingsView;
  /** Saves the shipping. */
  action: Action;
  /** Saves the lot's own pricing parameters and reprices it. */
  paramsAction: Action;
  /** Switches the lot between Global and Propio. */
  modeAction: Action;
  display?: CurrencyDisplay;
}) {
  const { summary, params } = lot;
  const money = moneyFormatter(display.currency, display.exchangeRate);
  const investment = moneyPair(display.currency, summary.investmentGs, summary.investmentUsd);
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
        <KpiCard label="Inversión" value={investment.value} detail={investment.detail} />
        <KpiCard
          label="Stock valorizado"
          value={money(summary.stockValueGs)}
          detail="a precio de lista"
        />
      </div>
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1fr_320px]">
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-2xl text-ink">Stock por modelo y talle</h2>
          {lot.rows.length === 0 ? (
            <p className="text-sm text-muted">Este lote no tiene productos.</p>
          ) : (
            <LotGrid sizes={lot.sizes} rows={lot.rows} display={display} />
          )}
        </section>
        <div className="flex flex-col gap-6">
          <LotPricingPanel
            mode={lot.pricingMode}
            params={params}
            globalSettings={settings}
            modeAction={modeAction}
            paramsAction={paramsAction}
          />
          <LotShippingForm totalShippingUsd={lot.params.totalShippingUsd} action={action} />
        </div>
      </div>
    </div>
  );
}
