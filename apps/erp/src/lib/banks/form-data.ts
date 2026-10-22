import type { PhotoUpload } from "../products/photos";

/** The logo part of the bank form: the chosen file (if any) and the "Quitar logo" checkbox. */
export async function readLogoFields(
  formData: FormData,
): Promise<{ logo: PhotoUpload | null; removeLogo: boolean }> {
  const entry = formData.get("logo");
  // An untouched file input is submitted as an empty file.
  const logo =
    entry === null || typeof entry === "string" || entry.size === 0
      ? null
      : { type: entry.type, bytes: new Uint8Array(await entry.arrayBuffer()) };
  return { logo, removeLogo: formData.get("removeLogo") === "on" };
}
