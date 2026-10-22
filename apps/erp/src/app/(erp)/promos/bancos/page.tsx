import { BankPromosView } from "../../../../components/bank-promos-view";
import { BanksView } from "../../../../components/banks-view";
import { PageHeader } from "../../../../components/page-header";
import { todayIso } from "../../../../lib/dates";
import { getDb } from "../../../../lib/db";
import { getBankPromoList } from "../../../../lib/queries/bank-promos";
import { getBankList } from "../../../../lib/queries/banks";
import {
  deleteBankAction,
  deleteBankPromoAction,
  saveBankAction,
  setBankPromoActiveAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function BancosPage() {
  const db = getDb();
  const [promos, banks] = await Promise.all([getBankPromoList(db), getBankList(db)]);
  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Bancos"
        description="Promociones con bancos y tarjetas que se muestran en el catálogo."
      />
      <BankPromosView
        promos={promos}
        today={todayIso()}
        actions={{ setActive: setBankPromoActiveAction, remove: deleteBankPromoAction }}
      />
      <BanksView banks={banks} actions={{ save: saveBankAction, remove: deleteBankAction }} />
    </div>
  );
}
