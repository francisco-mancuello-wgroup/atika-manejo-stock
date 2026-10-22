/** Where uploaded bank logos live. Local disk today; swap the implementation for cloud storage later. */
export interface LogoStorage {
  /** Stores an optimized logo and returns the public URL to keep in `Bank.logoUrl`. */
  saveBankLogo(bankId: string, fileName: string, bytes: Uint8Array): Promise<string>;
  /** Deletes a stored logo by the URL returned from `saveBankLogo`; missing files are fine. */
  deleteBankLogo(url: string): Promise<void>;
}

export const LOGOS_PREFIX = "/media/banks/uploads/";

export function isUploadedLogo(url: string): boolean {
  return url.startsWith(LOGOS_PREFIX);
}
