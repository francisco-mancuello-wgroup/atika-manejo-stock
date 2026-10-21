import { ComprasView } from "../../components/compras-view";
import { getLotSummaries } from "../../lib/queries/lots";

export const dynamic = "force-dynamic";

export default async function ComprasPage() {
  return <ComprasView lots={await getLotSummaries()} />;
}
