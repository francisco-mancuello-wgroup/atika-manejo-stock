import { notFound } from "next/navigation";
import { LotDetailView } from "../../../../components/lot-detail-view";
import { getLotDetail } from "../../../../lib/queries/lots";
import { saveLotShippingAction } from "./actions";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function LotPage({ params }: { params: Promise<{ lotId: string }> }) {
  const { lotId } = await params;
  const lot = UUID.test(lotId) ? await getLotDetail(lotId) : null;
  if (!lot) notFound();
  return <LotDetailView lot={lot} action={saveLotShippingAction.bind(null, lot.id)} />;
}
