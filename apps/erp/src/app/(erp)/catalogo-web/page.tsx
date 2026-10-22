import { CatalogoWebView } from "../../../components/catalogo-web-view";
import { GroupsView } from "../../../components/groups-view";
import { parseCatalogFilters } from "../../../lib/catalog/filters";
import { parseGroupsSelection } from "../../../lib/catalog-groups/workspace";
import { getDb } from "../../../lib/db";
import { getCurrencyDisplay } from "../../../lib/display-currency";
import { getCatalogProducts, getCatalogSettings } from "../../../lib/queries/catalog";
import { getGroupDetail, getGroupList, getGroupOptions } from "../../../lib/queries/catalog-groups";
import { getPickerProducts } from "../../../lib/queries/discounts";
import {
  addProductsToGroupAction,
  deleteGroupAction,
  publishAllAction,
  removeProductFromGroupAction,
  saveCatalogSettingsAction,
  saveGroupAction,
  saveGroupAllocationsAction,
  saveLookbookAction,
  setCategoryAction,
  setGroupActiveAction,
  setVisibilityAction,
  setVisibilityManyAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function CatalogoWebPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const selection = parseGroupsSelection(params);
  if (selection.tab === "grupos") return <GroupsTab selection={selection} />;
  const filters = parseCatalogFilters(params);
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

async function GroupsTab({ selection }: { selection: ReturnType<typeof parseGroupsSelection> }) {
  const db = getDb();
  const now = new Date();
  const [groups, detail, options, products] = await Promise.all([
    getGroupList(db, now),
    selection.groupId ? getGroupDetail(db, selection.groupId, now) : null,
    getGroupOptions(db),
    // The picker list only feeds the editor.
    selection.isNew || selection.groupId ? getPickerProducts(db) : [],
  ]);
  return (
    <GroupsView
      groups={groups}
      selection={selection}
      detail={detail}
      options={options}
      products={products}
      actions={{
        saveGroup: saveGroupAction,
        setActive: setGroupActiveAction,
        saveAllocations: saveGroupAllocationsAction,
        addProducts: addProductsToGroupAction,
        removeProduct: removeProductFromGroupAction,
        deleteGroup: deleteGroupAction,
      }}
    />
  );
}
