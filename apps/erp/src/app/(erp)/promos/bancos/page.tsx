import { BanksView } from "../../../../components/banks-view";
import { PageHeader } from "../../../../components/page-header";
import { getDb } from "../../../../lib/db";
import { getBankList } from "../../../../lib/queries/banks";
import { deleteBankAction, saveBankAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function BancosPage() {
  const banks = await getBankList(getDb());
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Bancos" description="Promociones con bancos y tarjetas." />
      <BanksView banks={banks} actions={{ save: saveBankAction, remove: deleteBankAction }} />
    </div>
  );
}
