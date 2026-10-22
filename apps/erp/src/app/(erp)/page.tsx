import { ResumenView } from "../../components/resumen-view";
import { getCurrencyDisplay } from "../../lib/display-currency";
import { getResumen } from "../../lib/queries/summary";

// Reads the database on every request; never prerendered (build has no DATABASE_URL).
export const dynamic = "force-dynamic";

export default async function HomePage() {
  return <ResumenView data={await getResumen()} display={await getCurrencyDisplay()} />;
}
