import type { PhotoUpload } from "./photos";

/** The photo part of the product form: new files and the ids of photos to remove. */
export async function readPhotoFields(
  formData: FormData,
): Promise<{ uploads: PhotoUpload[]; removePhotoIds: string[] }> {
  const uploads: PhotoUpload[] = [];
  for (const entry of formData.getAll("photos")) {
    // An untouched file input is submitted as an empty file.
    if (typeof entry === "string" || entry.size === 0) continue;
    uploads.push({ type: entry.type, bytes: new Uint8Array(await entry.arrayBuffer()) });
  }
  const removePhotoIds = formData
    .getAll("removePhoto")
    .filter((value): value is string => typeof value === "string");
  return { uploads, removePhotoIds };
}
