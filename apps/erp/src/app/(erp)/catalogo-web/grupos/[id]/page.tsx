import { notFound } from "next/navigation";
import { GroupPage } from "../../../../../components/group-page";
import { getDb } from "../../../../../lib/db";
import { getGroupDetail, getGroupOptions } from "../../../../../lib/queries/catalog-groups";
import { getPickerProducts } from "../../../../../lib/queries/discounts";
import {
  addProductsToGroupAction,
  deleteGroupAction,
  removeProductFromGroupAction,
  saveGroupAction,
  saveGroupAllocationsAction,
} from "../../actions";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const detail = UUID.test(id) ? await getGroupDetail(db, id, new Date()) : null;
  if (!detail) notFound();
  const [options, products] = await Promise.all([getGroupOptions(db), getPickerProducts(db)]);
  return (
    <GroupPage
      detail={detail}
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
