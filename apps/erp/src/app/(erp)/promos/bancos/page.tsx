import { BankPromosWorkspace } from "../../../../components/bank-promos-workspace";
import { parseSelection } from "../../../../lib/bank-promos/workspace";
import { todayIso } from "../../../../lib/dates";
import { getDb } from "../../../../lib/db";
import {
  getBankPromoForEdit,
  getBankPromoList,
  getLotOptions,
} from "../../../../lib/queries/bank-promos";
import { getBankList } from "../../../../lib/queries/banks";
import { getPickerProducts } from "../../../../lib/queries/discounts";
import {
  deleteBankAction,
  deleteBankPromoAction,
  saveBankAction,
  saveBankPromoAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function BancosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const db = getDb();
  const [params, promos, banks] = await Promise.all([
    searchParams,
    getBankPromoList(db),
    getBankList(db),
  ]);
  const selection = parseSelection(params, {
    promoIds: promos.map((promo) => promo.id),
    bankIds: banks.map((bank) => bank.id),
  });
  // Lots and products only feed the promo form, so the banks tab does not read them.
  const editingPromo = selection.tab === "promos" && (selection.isNew || selection.id !== null);
  const [selectedPromo, lots, products] = await Promise.all([
    selection.tab === "promos" && selection.id ? getBankPromoForEdit(db, selection.id) : null,
    editingPromo ? getLotOptions(db) : [],
    editingPromo ? getPickerProducts(db) : [],
  ]);
  return (
    <BankPromosWorkspace
      selection={selection}
      promos={promos}
      banks={banks}
      lots={lots}
      products={products}
      selectedPromo={selectedPromo}
      today={todayIso()}
      actions={{
        savePromo: saveBankPromoAction,
        removePromo: deleteBankPromoAction,
        saveBank: saveBankAction,
        removeBank: deleteBankAction,
      }}
    />
  );
}
