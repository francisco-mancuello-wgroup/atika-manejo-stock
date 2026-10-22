import { promoHeadline } from "@atika/pricing";
import { notFound } from "next/navigation";
import { BankPromoForm } from "../../../../../components/bank-promo-form";
import { ConfirmDeleteButton } from "../../../../../components/confirm-delete-button";
import { PageHeader } from "../../../../../components/page-header";
import { getDb } from "../../../../../lib/db";
import { getBankPromoForEdit, getLotOptions } from "../../../../../lib/queries/bank-promos";
import { getBankList } from "../../../../../lib/queries/banks";
import { getPickerProducts } from "../../../../../lib/queries/discounts";
import { deleteBankPromoAction, saveBankPromoAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditBankPromoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const promo = await getBankPromoForEdit(db, id);
  if (!promo) notFound();
  const [banks, lots, products] = await Promise.all([
    getBankList(db),
    getLotOptions(db),
    getPickerProducts(db),
  ]);
  const headline = promoHeadline(promo);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={headline}
        description="Editá el beneficio, los bancos, los días y los productos."
        actions={
          <ConfirmDeleteButton
            id={promo.id}
            name={headline}
            noun="la promoción"
            action={deleteBankPromoAction}
            redirectTo="/promos/bancos"
          />
        }
      />
      <BankPromoForm
        banks={banks}
        lots={lots}
        products={products}
        initial={{
          kind: promo.kind,
          value: String(promo.value),
          capGs: promo.capGs === null ? "" : String(promo.capGs),
          startsAt: promo.startsAt ?? "",
          endsAt: promo.endsAt ?? "",
          terms: promo.terms ?? "",
          isActive: promo.isActive,
          scope: promo.scope,
          bankIds: promo.bankIds,
          days: promo.days,
          lotIds: promo.lotIds,
          productIds: promo.productIds,
        }}
        action={saveBankPromoAction.bind(null, promo.id)}
      />
    </div>
  );
}
