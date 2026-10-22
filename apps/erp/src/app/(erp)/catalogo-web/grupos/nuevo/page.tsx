import { GroupPage } from "../../../../../components/group-page";
import {
  deleteGroupAction,
  removeProductFromGroupAction,
  saveGroupAction,
  saveGroupAllocationsAction,
  setGroupActiveAction,
} from "../../actions";

export const dynamic = "force-dynamic";

export default function NewGroupPage() {
  return (
    <GroupPage
      detail={null}
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
