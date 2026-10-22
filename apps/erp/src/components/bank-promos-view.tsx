import { promoHeadline } from "@atika/pricing";
import { buttonVariants } from "@atika/ui";
import Link from "next/link";
import type { FormState } from "../lib/action-state";
import { formatPromoScope, promoStatus } from "../lib/bank-promos/format";
import { formatWindow } from "../lib/discounts/format";
import type { BankPromoSummary } from "../lib/queries/bank-promos";
import { BankLogo } from "./bank-logo";
import { ConfirmDeleteButton } from "./confirm-delete-button";
import { DiscountActiveSwitch } from "./discount-controls";
import { table } from "./styles";

export interface BankPromoActions {
  setActive: (promoId: string, isActive: boolean) => Promise<FormState>;
  remove: (promoId: string) => Promise<FormState>;
}

/** Promos list: what each one offers, which banks, where it applies, until when and its state. */
export function BankPromosView({
  promos,
  today,
  actions,
}: {
  promos: BankPromoSummary[];
  /** Asunción calendar day (`yyyy-mm-dd`), to tell current promos from scheduled and expired ones. */
  today: string;
  actions: BankPromoActions;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-2xl text-ink">Promociones</h2>
          <p className="text-sm text-muted">
            Se muestran en la ficha de cada producto del catálogo. Son informativas: no cambian
            precios ni ventas.
          </p>
        </div>
        <Link href="/promos/bancos/nueva" className={buttonVariants()}>
          Nueva promoción
        </Link>
      </div>

      {promos.length === 0 ? (
        <p className="text-sm text-muted">Todavía no creaste promociones.</p>
      ) : (
        <div className={table.wrapper}>
          <table className={table.root}>
            <thead className={table.head}>
              <tr>
                <th className={table.th}>Promoción</th>
                <th className={table.th}>Bancos</th>
                <th className={table.th}>Alcance</th>
                <th className={table.th}>Vigencia</th>
                <th className={table.th}>Estado</th>
                <th className={table.th}>Activa</th>
                <th className={table.th}>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {promos.map((promo) => {
                const headline = promoHeadline(promo);
                return (
                  <tr key={promo.id} className={table.row}>
                    <td className={`${table.td} font-medium`}>{headline}</td>
                    <td className={table.td}>
                      <div className="flex flex-wrap items-center gap-2">
                        {promo.banks.map((bank) => (
                          <BankLogo key={bank.id} name={bank.name} logoUrl={bank.logoUrl} />
                        ))}
                      </div>
                    </td>
                    <td className={table.td}>{formatPromoScope(promo)}</td>
                    <td className={`${table.td} text-muted`}>
                      {formatWindow(promo.startsAt, promo.endsAt)}
                    </td>
                    <td className={table.td}>{promoStatus(promo, today)}</td>
                    <td className={table.td}>
                      <DiscountActiveSwitch
                        discountId={promo.id}
                        name={headline}
                        isActive={promo.isActive}
                        action={actions.setActive}
                      />
                    </td>
                    <td className={table.td}>
                      <div className="flex items-center justify-end gap-4">
                        <Link
                          href={`/promos/bancos/${promo.id}`}
                          aria-label={`Editar: ${headline}`}
                          className="text-sm font-medium text-ink underline-offset-4 hover:underline"
                        >
                          Editar
                        </Link>
                        <ConfirmDeleteButton
                          id={promo.id}
                          name={headline}
                          noun="la promoción"
                          action={actions.remove}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
