import { notFound } from "next/navigation";
import { GroupPage } from "../../../../../components/group-page";
import { getDb } from "../../../../../lib/db";
import { getGroupDetail } from "../../../../../lib/queries/catalog-groups";
import {
  deleteGroupAction,
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
  return (
    <GroupPage
      detail={detail}
      actions={{
        saveGroup: saveGroupAction,
        saveAllocations: saveGroupAllocationsAction,
        removeProduct: removeProductFromGroupAction,
        deleteGroup: deleteGroupAction,
        setActive: setGroupActiveAction,
      }}
    />
  );
}
