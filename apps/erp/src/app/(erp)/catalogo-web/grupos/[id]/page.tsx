import { notFound } from "next/navigation";
import { GroupPage } from "../../../../../components/group-page";
import { getDb } from "../../../../../lib/db";
import { getGroupDetail, getGroupOptions } from "../../../../../lib/queries/catalog-groups";
import {
  addProductsToGroupAction,
  deleteGroupAction,
  listGroupCandidatesAction,
  removeProductFromGroupAction,
  saveGroupAction,
  saveGroupAllocationsAction,
  setGroupActiveAction,
} from "../../actions";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const detail = UUID.test(id) ? await getGroupDetail(db, id, new Date()) : null;
  if (!detail) notFound();
  const options = await getGroupOptions(db);
  return (
    <GroupPage
      detail={detail}
      options={options}
      actions={{
        saveGroup: saveGroupAction,
        saveAllocations: saveGroupAllocationsAction,
        addProducts: addProductsToGroupAction,
        listCandidates: listGroupCandidatesAction,
        removeProduct: removeProductFromGroupAction,
        deleteGroup: deleteGroupAction,
        setActive: setGroupActiveAction,
      }}
    />
  );
}
