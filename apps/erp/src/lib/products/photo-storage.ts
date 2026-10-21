/** Where uploaded product photos live. Local disk today; swap the implementation for cloud storage later. */
export interface PhotoStorage {
  /** Stores an optimized photo and returns the public URL to keep in `ProductImage.url`. */
  saveProductPhoto(productId: string, fileName: string, bytes: Uint8Array): Promise<string>;
  /** Deletes a stored photo by the URL returned from `saveProductPhoto`; missing files are fine. */
  deleteProductPhoto(url: string): Promise<void>;
}

/** URLs under this prefix were uploaded from the ERP; anything else comes from the seed. */
export const UPLOADS_PREFIX = "/media/products/uploads/";

export function isUploadedPhoto(url: string): boolean {
  return url.startsWith(UPLOADS_PREFIX);
}
