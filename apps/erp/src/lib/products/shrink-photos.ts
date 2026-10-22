/*
 * Photos and logos are shrunk in the browser before upload: Vercel rejects requests over 4.5 MB,
 * and a phone photo alone can weigh more. The server optimizes again (`photos.ts`, 1600 px WebP
 * at most), so sending 1600 px images loses nothing.
 */

/** Longest side sent to the server, the same the server keeps. */
export const UPLOAD_MAX_SIDE = 1600;
const JPEG_QUALITY = 0.88;

/** What one save can carry, below Vercel's 4.5 MB request limit (the form fields need room too). */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export function fitWithin(width: number, height: number, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export function tooBigToUpload(sizes: readonly number[]): boolean {
  return sizes.reduce((total, size) => total + size, 0) > MAX_UPLOAD_BYTES;
}

/** JPEGs stay JPEG; PNG and WebP become WebP, which keeps transparency (a JPEG would turn it black). */
export function shrunkType(type: string): "image/jpeg" | "image/webp" {
  return type === "image/jpeg" ? "image/jpeg" : "image/webp";
}

/**
 * The photo redrawn at most `UPLOAD_MAX_SIDE`; the original when the browser cannot redraw it in
 * that format or the result is not smaller.
 */
export async function shrinkPhoto(file: File): Promise<File> {
  if (typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const { width, height } = fitWithin(bitmap.width, bitmap.height, UPLOAD_MAX_SIDE);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const type = shrunkType(file.type);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, type, JPEG_QUALITY),
    );
    // Browsers that cannot encode WebP hand back a PNG instead: keep the original then
    if (!blob || blob.type !== type || blob.size >= file.size) return file;
    const extension = type === "image/jpeg" ? "jpg" : "webp";
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.${extension}`, { type });
  } catch {
    return file;
  }
}

/**
 * Replaces the files chosen in `input` by their shrunk versions and returns the files that will
 * be uploaded. Nothing is replaced when `isCurrent()` turns false meanwhile (the user picked
 * other files) or the browser lacks `DataTransfer`; the originals stay then.
 */
export async function shrinkInputPhotos(
  input: HTMLInputElement,
  isCurrent: () => boolean = () => true,
): Promise<File[]> {
  const originals = Array.from(input.files ?? []);
  const shrunk = await Promise.all(originals.map(shrinkPhoto));
  if (!isCurrent() || typeof DataTransfer !== "function") return originals;
  const transfer = new DataTransfer();
  for (const file of shrunk) transfer.items.add(file);
  input.files = transfer.files;
  return shrunk;
}
