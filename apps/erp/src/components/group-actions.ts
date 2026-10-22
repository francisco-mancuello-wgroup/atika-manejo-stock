import type { FormState } from "../lib/action-state";

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
  removeProduct: (groupId: string, productId: string) => Promise<FormState>;
  deleteGroup: (groupId: string) => Promise<FormState>;
  setActive: (groupId: string, active: boolean) => Promise<FormState>;
}
