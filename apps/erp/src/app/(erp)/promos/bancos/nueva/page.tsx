import { BankPromoForm } from "../../../../../components/bank-promo-form";
import { PageHeader } from "../../../../../components/page-header";
import { getDb } from "../../../../../lib/db";
import { getLotOptions } from "../../../../../lib/queries/bank-promos";
import { getBankList } from "../../../../../lib/queries/banks";
import { getPickerProducts } from "../../../../../lib/queries/discounts";
import { createBankPromoAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewBankPromoPage() {
  const db = getDb();
  const [banks, lots, products] = await Promise.all([
    getBankList(db),
    getLotOptions(db),
    getPickerProducts(db),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nueva promoción"
        description="Elegí el beneficio, los bancos, los días y a qué productos se aplica."
      />
      <BankPromoForm banks={banks} lots={lots} products={products} action={createBankPromoAction} />
    </div>
  );
}
