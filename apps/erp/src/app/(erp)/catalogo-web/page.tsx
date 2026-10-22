import { CatalogoWebView } from "../../../components/catalogo-web-view";
import { parseCatalogFilters } from "../../../lib/catalog/filters";
import { getCurrencyDisplay } from "../../../lib/display-currency";
import { getCatalogProducts, getCatalogSettings } from "../../../lib/queries/catalog";
import {
  publishAllAction,
  saveCatalogSettingsAction,
  saveLookbookAction,
  setCategoryAction,
  setVisibilityAction,
  setVisibilityManyAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function CatalogoWebPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseCatalogFilters(await searchParams);
  const [products, settings, display] = await Promise.all([
    getCatalogProducts(filters),
    getCatalogSettings(),
    getCurrencyDisplay(),
  ]);
  return (
    <CatalogoWebView
      products={products}
      settings={settings}
      filters={filters}
      display={display}
      actions={{
        setVisibility: setVisibilityAction,
        setCategory: setCategoryAction,
        setVisibilityMany: setVisibilityManyAction,
        publishAll: publishAllAction,
        saveSettings: saveCatalogSettingsAction,
        saveLookbook: saveLookbookAction,
      }}
    />
  );
}
