import { PageHeader } from "../../../components/page-header";
import { SettingsForm } from "../../../components/settings-forms";
import { getLotsForSettings } from "../../../lib/queries/lots";
import { getAppSettings } from "../../../lib/queries/settings";
import { saveSettingsAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ParametrosPage() {
  const [settings, lots] = await Promise.all([getAppSettings(), getLotsForSettings()]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Parámetros"
        description="Tipo de cambio del día y valores por defecto, y a qué lotes aplicarlos."
      />
      <SettingsForm settings={settings} lots={lots} action={saveSettingsAction} />
    </div>
  );
}
