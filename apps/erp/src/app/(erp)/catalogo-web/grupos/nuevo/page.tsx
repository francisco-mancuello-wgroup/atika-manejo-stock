import { GroupPage } from "../../../../../components/group-page";
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

export default function NewGroupPage() {
  return (
    <GroupPage
      detail={null}
      options={{ lots: [], brands: [] }}
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
