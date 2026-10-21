import { buttonVariants } from "@atika/ui";
import Link from "next/link";
import type { FormState } from "../lib/action-state";
import { formatScope, formatWindow } from "../lib/discounts/format";
import type { DiscountSummary } from "../lib/queries/discounts";
import { DeleteDiscountButton, DiscountActiveSwitch } from "./discount-controls";
import { PageHeader } from "./page-header";
import { table } from "./styles";

export interface DiscountActions {
  setActive: (discountId: string, isActive: boolean) => Promise<FormState>;
  remove: (discountId: string) => Promise<FormState>;
}

export function DiscountsView({
  discounts,
  actions,
}: {
  discounts: DiscountSummary[];
  actions: DiscountActions;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Descuentos"
        description="Porcentajes que se descuentan del precio en el catálogo y en las ventas. Si dos descuentos coinciden, se aplica el mayor."
        actions={
          <Link href="/descuentos/nuevo" className={buttonVariants()}>
            Nuevo descuento
          </Link>
        }
      />

      {discounts.length === 0 ? (
        <p className="text-sm text-muted">Todavía no creaste descuentos.</p>
      ) : (
        <div className={table.wrapper}>
          <table className={table.root}>
            <thead className={table.head}>
              <tr>
                <th className={table.th}>Nombre</th>
                <th className={`${table.th} ${table.num}`}>Descuento</th>
                <th className={table.th}>Alcance</th>
                <th className={table.th}>Vigencia</th>
                <th className={table.th}>Activo</th>
                <th className={table.th}>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {discounts.map((discount) => (
                <tr key={discount.id} className={table.row}>
                  <td className={`${table.td} font-medium`}>{discount.name}</td>
                  <td className={`${table.td} ${table.num}`}>{`${discount.percent} %`}</td>
                  <td className={table.td}>{formatScope(discount.scope, discount.productCount)}</td>
                  <td className={`${table.td} text-muted`}>
                    {formatWindow(discount.startsAt, discount.endsAt)}
                  </td>
                  <td className={table.td}>
                    <DiscountActiveSwitch
                      discountId={discount.id}
                      name={discount.name}
                      isActive={discount.isActive}
                      action={actions.setActive}
                    />
                  </td>
                  <td className={table.td}>
                    <div className="flex items-center justify-end gap-4">
                      <Link
                        href={`/descuentos/${discount.id}`}
                        aria-label={`Editar: ${discount.name}`}
                        className="text-sm font-medium text-ink underline-offset-4 hover:underline"
                      >
                        Editar
                      </Link>
                      <DeleteDiscountButton
                        discountId={discount.id}
                        name={discount.name}
                        action={actions.remove}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
