import { hasBlobStore, vercelBlobClient } from "../blob-uploads";
import { createBlobPhotoStorage } from "./blob-photo-storage";
import { localPhotoStorage } from "./local-photo-storage";
import type { PhotoStorage } from "./photo-storage";

/** Vercel Blob in production (the server disk is wiped on every deploy), local disk in dev. */
export function productPhotoStorage(): PhotoStorage {
  return hasBlobStore() ? createBlobPhotoStorage(vercelBlobClient()) : localPhotoStorage();
}
