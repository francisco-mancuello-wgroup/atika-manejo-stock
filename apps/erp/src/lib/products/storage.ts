import { hasBlobStore, vercelBlobClient } from "../blob-uploads";
import { mediaDir } from "../media-dir";
import { createBlobPhotoStorage } from "./blob-photo-storage";
import { createMediaDirPhotoStorage, localPhotoStorage } from "./local-photo-storage";
import type { PhotoStorage } from "./photo-storage";

/**
 * Where uploaded photos go, first match wins:
 * 1. `MEDIA_DIR` set (VPS): that persistent folder, served by the web server under `/media`.
 * 2. A Vercel Blob token (Vercel, where the server disk is wiped on every deploy): Vercel Blob.
 * 3. Otherwise (dev): local disk, both apps' `public` folders.
 */
export function productPhotoStorage(): PhotoStorage {
  const dir = mediaDir();
  if (dir) return createMediaDirPhotoStorage(dir);
  return hasBlobStore() ? createBlobPhotoStorage(vercelBlobClient()) : localPhotoStorage();
}
