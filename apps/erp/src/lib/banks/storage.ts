import { hasBlobStore, vercelBlobClient } from "../blob-uploads";
import { mediaDir } from "../media-dir";
import { createBlobLogoStorage } from "./blob-logo-storage";
import { createMediaDirLogoStorage, localLogoStorage } from "./local-logo-storage";
import type { LogoStorage } from "./logo-storage";

/**
 * Where uploaded logos go, first match wins:
 * 1. `MEDIA_DIR` set (VPS): that persistent folder, served by the web server under `/media`.
 * 2. A Vercel Blob token (Vercel, where the server disk is wiped on every deploy): Vercel Blob.
 * 3. Otherwise (dev): local disk, both apps' `public` folders.
 */
export function bankLogoStorage(): LogoStorage {
  const dir = mediaDir();
  if (dir) return createMediaDirLogoStorage(dir);
  return hasBlobStore() ? createBlobLogoStorage(vercelBlobClient()) : localLogoStorage();
}
