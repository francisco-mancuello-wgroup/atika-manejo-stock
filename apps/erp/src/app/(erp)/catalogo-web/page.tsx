import { redirect } from "next/navigation";
import { BrandsView } from "../../../components/brands-view";
import { CatalogoWebView } from "../../../components/catalogo-web-view";
import { GroupsView } from "../../../components/groups-view";
import { listBrands } from "../../../lib/brands/save";
import { parseCatalogFilters } from "../../../lib/catalog/filters";
import { legacyGroupRedirect, parseCatalogTab } from "../../../lib/catalog-groups/workspace";
import { getDb } from "../../../lib/db";
import { getCurrencyDisplay } from "../../../lib/display-currency";
import { getCatalogProducts, getCatalogSettings } from "../../../lib/queries/catalog";
import { getActiveGroupNames, getGroupList } from "../../../lib/queries/catalog-groups";
import {
  publishAllAction,
  saveCatalogSettingsAction,
  saveLookbookAction,
  setCategoryAction,
  setGroupActiveAction,
  setVisibilityAction,
  setVisibilityManyAction,
} from "./actions";
import {
  moveBrandAction,
  removeBrandCoverAction,
  saveBrandCoverAction,
  setBrandActiveAction,
} from "./marcas/actions";

export const dynamic = "force-dynamic";

export default async function CatalogoWebPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const legacy = legacyGroupRedirect(params);
  if (legacy) redirect(legacy);
  const tab = parseCatalogTab(params);
  if (tab === "grupos") return <GroupsTab />;
  if (tab === "marcas") return <BrandsTab />;
  const filters = parseCatalogFilters(params);
  const [products, settings, display, activeGroupNames] = await Promise.all([
    getCatalogProducts(filters),
    getCatalogSettings(),
    getCurrencyDisplay(),
    getActiveGroupNames(getDb()),
  ]);
  return (
    <CatalogoWebView
      products={products}
      settings={settings}
      filters={filters}
      display={display}
      activeGroupNames={activeGroupNames}
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

async function GroupsTab() {
  const groups = await getGroupList(getDb(), new Date());
  return <GroupsView groups={groups} actions={{ setActive: setGroupActiveAction }} />;
}

async function BrandsTab() {
  const brands = await listBrands(getDb(), new Date());
  return (
    <BrandsView
      brands={brands}
      actions={{
        setActive: setBrandActiveAction,
        move: moveBrandAction,
        saveCover: saveBrandCoverAction,
        removeCover: removeBrandCoverAction,
      }}
    />
  );
}
