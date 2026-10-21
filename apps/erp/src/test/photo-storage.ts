import type { PhotoStorage } from "../lib/products/photo-storage";

/** In-memory storage for tests: records what would be written to disk. */
export function memoryPhotoStorage() {
  const files = new Map<string, Uint8Array>();
  let counter = 0;
  const storage: PhotoStorage = {
    async saveProductPhoto(productId, fileName, bytes) {
      counter += 1;
      const url = `/media/products/uploads/${productId}/${counter}-${fileName}`;
      files.set(url, bytes);
      return url;
    },
    async deleteProductPhoto(url) {
      files.delete(url);
    },
  };
  return { storage, files };
}
