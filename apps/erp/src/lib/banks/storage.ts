import { hasBlobStore, vercelBlobClient } from "../blob-uploads";
import { createBlobLogoStorage } from "./blob-logo-storage";
import { localLogoStorage } from "./local-logo-storage";
import type { LogoStorage } from "./logo-storage";

/** Vercel Blob in production (the server disk is wiped on every deploy), local disk in dev. */
export function bankLogoStorage(): LogoStorage {
  return hasBlobStore() ? createBlobLogoStorage(vercelBlobClient()) : localLogoStorage();
}
