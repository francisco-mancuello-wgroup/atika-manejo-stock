"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type FormState, formValues } from "../../../lib/action-state";
import { requireSession } from "../../../lib/auth/session";
import {
  publishAllInStock,
  saveCatalogSettings,
  setProductCategory,
  setProductsVisibility,
  setProductVisibility,
} from "../../../lib/catalog/save";
import { endOfDayInput } from "../../../lib/catalog-groups/format";
import {
  activateGroup,
  addProductsToGroup,
  createGroup,
  deactivateGroup,
  deleteGroup,
  type ProductFilter,
  removeProductFromGroup,
  setGroupAllocations,
  updateGroup,
} from "../../../lib/catalog-groups/groups";
import type { Proposal } from "../../../lib/catalog-groups/stock";
import { groupHref } from "../../../lib/catalog-groups/workspace";
import { notifyCatalogChanged } from "../../../lib/catalog-live";
import { getDb } from "../../../lib/db";
import { type GroupCandidate, getGroupCandidates } from "../../../lib/queries/catalog-groups";

const FAILED = {
  status: "error",
  message: "No se pudo guardar. Intentá de nuevo en unos segundos.",
} as const;

function revalidateCatalogAdmin() {
  revalidatePath("/catalogo-web");
  notifyCatalogChanged();
}

/** Group changes move the free stock, so the inventory and the sales form refresh too. */
function revalidateGroups(groupId?: string) {
  revalidatePath("/catalogo-web");
  if (groupId) revalidatePath(groupHref(groupId));
  revalidatePath("/inventario");
  revalidatePath("/ventas");
  notifyCatalogChanged();
}

export async function setVisibilityAction(
  productId: string,
  isPublished: boolean,
): Promise<FormState> {
  await requireSession();
  try {
    const state = await setProductVisibility(getDb(), productId, isPublished);
    if (state.status === "success") revalidateCatalogAdmin();
    return state;
  } catch (error) {
    console.error("setVisibilityAction failed", error);
    return FAILED;
  }
}

export async function setVisibilityManyAction(
  productIds: string[],
  isPublished: boolean,
): Promise<FormState> {
  await requireSession();
  try {
    const state = await setProductsVisibility(getDb(), productIds, isPublished);
    if (state.status === "success") revalidateCatalogAdmin();
    return state;
  } catch (error) {
    console.error("setVisibilityManyAction failed", error);
    return FAILED;
  }
}

export async function setCategoryAction(productId: string, category: string): Promise<FormState> {
  await requireSession();
  try {
    const state = await setProductCategory(getDb(), productId, category);
    if (state.status === "success") revalidateCatalogAdmin();
    return state;
  } catch (error) {
    console.error("setCategoryAction failed", error);
    return FAILED;
  }
}

export async function publishAllAction(): Promise<FormState> {
  await requireSession();
  try {
    const state = await publishAllInStock(getDb());
    if (state.status === "success") revalidateCatalogAdmin();
    return state;
  } catch (error) {
    console.error("publishAllAction failed", error);
    return FAILED;
  }
}

export async function saveCatalogSettingsAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();
  const values = formValues(formData);
  try {
    const state = await saveCatalogSettings(getDb(), values);
    if (state.status === "success") revalidateCatalogAdmin();
    return state;
  } catch (error) {
    console.error("saveCatalogSettingsAction failed", error);
    return { ...FAILED, values };
  }
}

/** Creates (`groupId` null, then opens the new group page) or renames/re-dates a publication group. */
export async function saveGroupAction(
  groupId: string | null,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();
  const raw = formValues(formData);
  const values = { ...raw, endsAt: endOfDayInput(raw.endsAt ?? "") };
  let createdId: string | undefined;
  try {
    if (groupId) {
      const state = await updateGroup(getDb(), groupId, values);
      if (state.status === "success") revalidateGroups(groupId);
      return state.status === "error" ? { ...state, values: raw } : state;
    }
    const outcome = await createGroup(getDb(), values);
    if (outcome.state.status !== "success" || !outcome.groupId) {
      return outcome.state.status === "error" ? { ...outcome.state, values: raw } : outcome.state;
    }
    revalidateGroups(outcome.groupId);
    createdId = outcome.groupId;
  } catch (error) {
    console.error("saveGroupAction failed", error);
    return { ...FAILED, values: raw };
  }
  redirect(groupHref(createdId));
}

export async function setGroupActiveAction(groupId: string, active: boolean): Promise<FormState> {
  await requireSession();
  try {
    const state = active
      ? await activateGroup(getDb(), groupId)
      : await deactivateGroup(getDb(), groupId);
    if (state.status === "success") revalidateGroups(groupId);
    return state;
  } catch (error) {
    console.error("setGroupActiveAction failed", error);
    return FAILED;
  }
}

export async function saveGroupAllocationsAction(
  groupId: string,
  entries: { variantId: string; allocated: number }[],
): Promise<FormState> {
  await requireSession();
  try {
    const state = await setGroupAllocations(getDb(), groupId, entries);
    if (state.status === "success") revalidateGroups(groupId);
    return state;
  } catch (error) {
    console.error("saveGroupAllocationsAction failed", error);
    return FAILED;
  }
}

export async function addProductsToGroupAction(
  groupId: string,
  filter: ProductFilter,
  proposal: Proposal = "all",
): Promise<FormState> {
  await requireSession();
  try {
    const state = await addProductsToGroup(getDb(), groupId, filter, new Date(), proposal);
    if (state.status === "success") revalidateGroups(groupId);
    return state;
  } catch (error) {
    console.error("addProductsToGroupAction failed", error);
    return FAILED;
  }
}

/** Products a bulk add could take for a filter, with the stock each size has free (read only). */
export async function listGroupCandidatesAction(
  groupId: string,
  filter: ProductFilter,
): Promise<GroupCandidate[]> {
  await requireSession();
  try {
    return await getGroupCandidates(getDb(), groupId, filter);
  } catch (error) {
    console.error("listGroupCandidatesAction failed", error);
    return [];
  }
}

export async function removeProductFromGroupAction(
  groupId: string,
  productId: string,
): Promise<FormState> {
  await requireSession();
  try {
    const state = await removeProductFromGroup(getDb(), groupId, productId);
    if (state.status === "success") revalidateGroups(groupId);
    return state;
  } catch (error) {
    console.error("removeProductFromGroupAction failed", error);
    return FAILED;
  }
}

export async function deleteGroupAction(groupId: string): Promise<FormState> {
  await requireSession();
  try {
    const state = await deleteGroup(getDb(), groupId);
    if (state.status === "success") revalidateGroups(groupId);
    return state;
  } catch (error) {
    console.error("deleteGroupAction failed", error);
    return FAILED;
  }
}
