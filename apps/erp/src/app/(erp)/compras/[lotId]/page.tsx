import { notFound } from "next/navigation";
import { LotDetailView } from "../../../../components/lot-detail-view";
import { getCurrencyDisplay } from "../../../../lib/display-currency";
import { getLotDetail } from "../../../../lib/queries/lots";
import { getAppSettings } from "../../../../lib/queries/settings";
import { saveLotParamsAction, saveLotShippingAction, setLotPricingModeAction } from "./actions";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function LotPage({ params }: { params: Promise<{ lotId: string }> }) {
  const { lotId } = await params;
  const lot = UUID.test(lotId) ? await getLotDetail(lotId) : null;
  if (!lot) notFound();
  const [settings, display] = await Promise.all([getAppSettings(), getCurrencyDisplay()]);
  return (
    <LotDetailView
      lot={lot}
      settings={settings}
      display={display}
      action={saveLotShippingAction.bind(null, lot.id)}
      paramsAction={saveLotParamsAction.bind(null, lot.id)}
      modeAction={setLotPricingModeAction.bind(null, lot.id)}
    />
  );
}
