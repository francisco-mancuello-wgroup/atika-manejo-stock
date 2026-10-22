import { blobPathname } from "../blob-url";

/** Where uploaded bank logos live: Vercel Blob in production, local disk in dev (`storage.ts`). */
export interface LogoStorage {
  /** Stores an optimized logo and returns the public URL to keep in `Bank.logoUrl`. */
  saveBankLogo(bankId: string, fileName: string, bytes: Uint8Array): Promise<string>;
  /** Deletes a stored logo by the URL returned from `saveBankLogo`; missing files are fine. */
  deleteBankLogo(url: string): Promise<void>;
}

/** Logos uploaded to local disk live under this prefix. */
export const LOGOS_PREFIX = "/media/banks/uploads/";

/** Folder of the uploaded logos inside the Vercel Blob store. */
export const BLOB_LOGOS_FOLDER = "banks/uploads/";

/** Uploaded from the ERP (local disk or Vercel Blob), as opposed to a seed logo. */
export function isUploadedLogo(url: string): boolean {
  return url.startsWith(LOGOS_PREFIX) || Boolean(blobPathname(url)?.startsWith(BLOB_LOGOS_FOLDER));
}
