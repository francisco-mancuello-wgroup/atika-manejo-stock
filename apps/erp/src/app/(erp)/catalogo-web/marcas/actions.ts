"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "../../../../lib/action-state";
import { requireSession } from "../../../../lib/auth/session";
import { brandCoverStorage } from "../../../../lib/brands/cover-storage";
import {
  moveBrand,
  removeBrandCover,
  saveBrandCover,
  setBrandActive,
} from "../../../../lib/brands/save";
import { notifyCatalogChanged } from "../../../../lib/catalog-live";
import { getDb } from "../../../../lib/db";
import type { PhotoUpload } from "../../../../lib/products/photos";

const FAILED = {
  status: "error",
  message: "No se pudo guardar. Intentá de nuevo en unos segundos.",
} as const;

/** Brands decide what the whole web shows, so open catalog pages are told to refresh. */
function revalidateBrands() {
  revalidatePath("/catalogo-web");
  notifyCatalogChanged();
}

export async function setBrandActiveAction(brandId: string, active: boolean): Promise<FormState> {
  await requireSession();
  try {
    const state = await setBrandActive(getDb(), brandId, active);
    if (state.status === "success") revalidateBrands();
    return state;
  } catch (error) {
    console.error("setBrandActiveAction failed", error);
    return FAILED;
  }
}

export async function moveBrandAction(
  brandId: string,
  direction: "up" | "down",
): Promise<FormState> {
  await requireSession();
  try {
    const state = await moveBrand(getDb(), brandId, direction);
    if (state.status === "success") revalidateBrands();
    return state;
  } catch (error) {
    console.error("moveBrandAction failed", error);
    return FAILED;
  }
}

/** The cover chosen in the row's file input (already shrunk in the browser). */
export async function saveBrandCoverAction(
  brandId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();
  const entry = formData.get("cover");
  if (entry === null || typeof entry === "string" || entry.size === 0) {
    return { status: "error", message: "Elegí una foto para la portada." };
  }
  const upload: PhotoUpload = {
    type: entry.type,
    bytes: new Uint8Array(await entry.arrayBuffer()),
  };
  try {
    const state = await saveBrandCover(getDb(), brandId, upload, brandCoverStorage());
    if (state.status === "success") revalidateBrands();
    return state;
  } catch (error) {
    console.error("saveBrandCoverAction failed", error);
    return FAILED;
  }
}

export async function removeBrandCoverAction(brandId: string): Promise<FormState> {
  await requireSession();
  try {
    const state = await removeBrandCover(getDb(), brandId, brandCoverStorage());
    if (state.status === "success") revalidateBrands();
    return state;
  } catch (error) {
    console.error("removeBrandCoverAction failed", error);
    return FAILED;
  }
}
