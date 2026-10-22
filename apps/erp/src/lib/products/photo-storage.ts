import { blobPathname } from "../blob-url";

/** Where uploaded product photos live: Vercel Blob in production, local disk in dev (`storage.ts`). */
export interface PhotoStorage {
  /** Stores an optimized photo and returns the public URL to keep in `ProductImage.url`. */
  saveProductPhoto(productId: string, fileName: string, bytes: Uint8Array): Promise<string>;
  /** Deletes a stored photo by the URL returned from `saveProductPhoto`; missing files are fine. */
  deleteProductPhoto(url: string): Promise<void>;
}

/** URLs under this prefix were uploaded from the ERP to local disk; seed photos live elsewhere. */
export const UPLOADS_PREFIX = "/media/products/uploads/";

/** Folder of the uploaded photos inside the Vercel Blob store. */
export const BLOB_UPLOADS_FOLDER = "products/uploads/";

/** Uploaded from the ERP (local disk or Vercel Blob), as opposed to a seed photo. */
export function isUploadedPhoto(url: string): boolean {
  return (
    url.startsWith(UPLOADS_PREFIX) || Boolean(blobPathname(url)?.startsWith(BLOB_UPLOADS_FOLDER))
  );
}
