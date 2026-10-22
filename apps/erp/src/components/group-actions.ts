import type { FormState } from "../lib/action-state";
import type { ProductFilter } from "../lib/catalog-groups/groups";
import type { Proposal } from "../lib/catalog-groups/stock";
import type { GroupCandidate } from "../lib/queries/catalog-groups";

/** Server actions the group page needs; the route wires them, tests pass fakes. */
export interface GroupActions {
  /** `groupId` is null when creating. */
  saveGroup: (
    groupId: string | null,
    previous: FormState,
    formData: FormData,
  ) => Promise<FormState>;
  saveAllocations: (
    groupId: string,
    entries: { variantId: string; allocated: number }[],
  ) => Promise<FormState>;
  addProducts: (groupId: string, filter: ProductFilter, proposal: Proposal) => Promise<FormState>;
  listCandidates: (groupId: string, filter: ProductFilter) => Promise<GroupCandidate[]>;
  removeProduct: (groupId: string, productId: string) => Promise<FormState>;
  deleteGroup: (groupId: string) => Promise<FormState>;
  setActive: (groupId: string, active: boolean) => Promise<FormState>;
}
