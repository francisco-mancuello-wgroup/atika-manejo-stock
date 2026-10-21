import { PageHeader } from "../../components/page-header";
import { SettingsForms } from "../../components/settings-forms";
import { getAppSettings } from "../../lib/queries/settings";
import { applyToAllLotsAction, saveSettingsAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ParametrosPage() {
  const settings = await getAppSettings();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Parámetros"
        description="Tipo de cambio del día y valores por defecto para los lotes nuevos."
      />
      <SettingsForms
        settings={settings}
        saveAction={saveSettingsAction}
        applyAction={applyToAllLotsAction}
      />
    </div>
  );
}
