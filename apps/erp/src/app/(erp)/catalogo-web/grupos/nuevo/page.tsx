import { GroupPage } from "../../../../../components/group-page";
import { getDb } from "../../../../../lib/db";
import { getGroupOptions } from "../../../../../lib/queries/catalog-groups";
import { getPickerProducts } from "../../../../../lib/queries/discounts";
import {
  addProductsToGroupAction,
  deleteGroupAction,
  removeProductFromGroupAction,
  saveGroupAction,
  saveGroupAllocationsAction,
} from "../../actions";

export const dynamic = "force-dynamic";

export default async function NewGroupPage() {
  const db = getDb();
  const [options, products] = await Promise.all([getGroupOptions(db), getPickerProducts(db)]);
  return (
    <GroupPage
      detail={null}
      options={options}
      products={products}
      actions={{
        saveGroup: saveGroupAction,
        saveAllocations: saveGroupAllocationsAction,
        addProducts: addProductsToGroupAction,
        removeProduct: removeProductFromGroupAction,
        deleteGroup: deleteGroupAction,
      }}
    />
  );
}
