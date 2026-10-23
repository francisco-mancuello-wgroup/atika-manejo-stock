import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { blobPathname } from "../blob-url";
import { mediaFile } from "../media-dir";
import { isUploadedPhoto, type PhotoStorage, UPLOADS_PREFIX } from "./photo-storage";

const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function assertSafe(value: string, what: string) {
  if (!SAFE_SEGMENT.test(value) || value.includes("..")) throw new Error(`Unsafe ${what}`);
}

/**
 * Stores photos on local disk, in every given `public` folder (the ERP serves them for itself
 * and the catalog app for the storefront). Replace with a cloud-backed `PhotoStorage` later.
 */
export function createLocalPhotoStorage(publicDirs: readonly string[]): PhotoStorage {
  return createDiskPhotoStorage((url) => publicDirs.map((dir) => path.join(dir, url)), false);
}

/**
 * Stores photos only in `mediaDir`, the folder behind the `/media` URL prefix (`MEDIA_DIR`, kept
 * outside the build and served by the web server). `/media/x/y` is written to `mediaDir/x/y`.
 * A leftover Vercel Blob URL is never on this disk, so deleting it is a no-op, not an error.
 */
export function createMediaDirPhotoStorage(mediaDir: string): PhotoStorage {
  return createDiskPhotoStorage((url) => [mediaFile(mediaDir, url)], true);
}

function createDiskPhotoStorage(
  filesFor: (url: string) => string[],
  ignoreBlobUrls: boolean,
): PhotoStorage {
  return {
    async saveProductPhoto(productId, fileName, bytes) {
      assertSafe(productId, "product id");
      assertSafe(fileName, "file name");
      const url = `${UPLOADS_PREFIX}${productId}/${fileName}`;
      for (const file of filesFor(url)) {
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, bytes);
      }
      return url;
    },
    async deleteProductPhoto(url) {
      if (ignoreBlobUrls && blobPathname(url)) return;
      const parts = url.slice(UPLOADS_PREFIX.length).split("/");
      if (
        !isUploadedPhoto(url) ||
        parts.length !== 2 ||
        !parts.every((part) => SAFE_SEGMENT.test(part) && !part.includes(".."))
      ) {
        throw new Error("Not an uploaded photo URL");
      }
      for (const file of filesFor(url)) await rm(file, { force: true });
    },
  };
}

/** Local disk for the dev/prod setup: `apps/erp/public` and `apps/catalog/public`. */
export function localPhotoStorage(): PhotoStorage {
  const erp = path.join(process.cwd(), "public");
  const catalog = path.resolve(process.cwd(), "../catalog/public");
  return createLocalPhotoStorage([erp, catalog]);
}
