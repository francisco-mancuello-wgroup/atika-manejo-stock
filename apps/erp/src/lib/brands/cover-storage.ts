import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  type BlobClient,
  createBlobUploads,
  hasBlobStore,
  vercelBlobClient,
} from "../blob-uploads";
import { blobPathname } from "../blob-url";
import { mediaDir, mediaFile } from "../media-dir";

/** Where uploaded brand covers live: Vercel Blob in production, local disk in dev. */
export interface CoverStorage {
  /** Stores an optimized cover and returns the public URL to keep in `Brand.coverUrl`. */
  saveBrandCover(brandId: string, fileName: string, bytes: Uint8Array): Promise<string>;
  /** Deletes a stored cover by the URL `saveBrandCover` returned; missing files are fine. */
  deleteBrandCover(url: string): Promise<void>;
}

/** Covers uploaded to disk live under this prefix. */
export const COVERS_PREFIX = "/media/brands/uploads/";

/** Folder of the uploaded covers inside the Vercel Blob store. */
export const BLOB_COVERS_FOLDER = "brands/uploads/";

/** Uploaded from the ERP (local disk or Vercel Blob), as opposed to a static or product photo. */
export function isUploadedCover(url: string): boolean {
  return (
    url.startsWith(COVERS_PREFIX) || Boolean(blobPathname(url)?.startsWith(BLOB_COVERS_FOLDER))
  );
}

const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const isSafe = (value: string) => SAFE_SEGMENT.test(value) && !value.includes("..");

function createDiskCoverStorage(
  filesFor: (url: string) => string[],
  ignoreBlobUrls: boolean,
): CoverStorage {
  return {
    async saveBrandCover(brandId, fileName, bytes) {
      if (!isSafe(brandId) || !isSafe(fileName)) throw new Error("Unsafe brand cover name");
      const url = `${COVERS_PREFIX}${brandId}/${fileName}`;
      for (const file of filesFor(url)) {
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, bytes);
      }
      return url;
    },
    async deleteBrandCover(url) {
      if (ignoreBlobUrls && blobPathname(url)) return;
      const parts = url.slice(COVERS_PREFIX.length).split("/");
      if (!isUploadedCover(url) || parts.length !== 2 || !parts.every(isSafe)) {
        throw new Error("Not an uploaded cover URL");
      }
      for (const file of filesFor(url)) await rm(file, { force: true });
    },
  };
}

/** Local disk in every given `public` folder (the ERP and the catalog app serve them). */
export function createLocalCoverStorage(publicDirs: readonly string[]): CoverStorage {
  return createDiskCoverStorage((url) => publicDirs.map((dir) => path.join(dir, url)), false);
}

/** Only `mediaDir`, the folder behind the `/media` URL prefix (`MEDIA_DIR`, VPS). */
export function createMediaDirCoverStorage(dir: string): CoverStorage {
  return createDiskCoverStorage((url) => [mediaFile(dir, url)], true);
}

/** Vercel Blob, so uploads survive deploys and are shared by every instance. */
export function createBlobCoverStorage(client: BlobClient): CoverStorage {
  const uploads = createBlobUploads(client, BLOB_COVERS_FOLDER, COVERS_PREFIX);
  return { saveBrandCover: uploads.save, deleteBrandCover: uploads.remove };
}

/**
 * Where uploaded covers go, first match wins: `MEDIA_DIR` (VPS), then a Vercel Blob token, else
 * local disk in both apps' `public` folders (dev). Same order as bank logos and product photos.
 */
export function brandCoverStorage(): CoverStorage {
  const dir = mediaDir();
  if (dir) return createMediaDirCoverStorage(dir);
  if (hasBlobStore()) return createBlobCoverStorage(vercelBlobClient());
  return createLocalCoverStorage([
    path.join(process.cwd(), "public"),
    path.resolve(process.cwd(), "../catalog/public"),
  ]);
}
