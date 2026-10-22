import { PageHeader } from "../../../components/page-header";
import { SettingsForm } from "../../../components/settings-forms";
import { getCurrencyDisplay } from "../../../lib/display-currency";
import { getLotsForPricingPreview } from "../../../lib/queries/lots";
import { getAppSettings } from "../../../lib/queries/settings";
import { saveSettingsAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ParametrosPage() {
  const [settings, lots, display] = await Promise.all([
    getAppSettings(),
    getLotsForPricingPreview(),
    getCurrencyDisplay(),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Parámetros"
        description="Único lugar donde se definen los precios: TC, factor, IVA y % de costo, y se aplican siempre a todos los lotes."
      />
      <SettingsForm settings={settings} lots={lots} display={display} action={saveSettingsAction} />
    </div>
  );
}
