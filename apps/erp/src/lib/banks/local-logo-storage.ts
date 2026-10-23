import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { blobPathname } from "../blob-url";
import { mediaFile } from "../media-dir";
import { isUploadedLogo, LOGOS_PREFIX, type LogoStorage } from "./logo-storage";

const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function assertSafe(value: string, what: string) {
  if (!SAFE_SEGMENT.test(value) || value.includes("..")) throw new Error(`Unsafe ${what}`);
}

/**
 * Stores logos on local disk, in every given `public` folder (the ERP serves them for itself
 * and the catalog app for the storefront), like product photos.
 */
export function createLocalLogoStorage(publicDirs: readonly string[]): LogoStorage {
  return createDiskLogoStorage((url) => publicDirs.map((dir) => path.join(dir, url)), false);
}

/**
 * Stores logos only in `mediaDir`, the folder behind the `/media` URL prefix (`MEDIA_DIR`, kept
 * outside the build and served by the web server). `/media/x/y` is written to `mediaDir/x/y`.
 * A leftover Vercel Blob URL is never on this disk, so deleting it is a no-op, not an error.
 */
export function createMediaDirLogoStorage(mediaDir: string): LogoStorage {
  return createDiskLogoStorage((url) => [mediaFile(mediaDir, url)], true);
}

function createDiskLogoStorage(
  filesFor: (url: string) => string[],
  ignoreBlobUrls: boolean,
): LogoStorage {
  return {
    async saveBankLogo(bankId, fileName, bytes) {
      assertSafe(bankId, "bank id");
      assertSafe(fileName, "file name");
      const url = `${LOGOS_PREFIX}${bankId}/${fileName}`;
      for (const file of filesFor(url)) {
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, bytes);
      }
      return url;
    },
    async deleteBankLogo(url) {
      if (ignoreBlobUrls && blobPathname(url)) return;
      const parts = url.slice(LOGOS_PREFIX.length).split("/");
      if (
        !isUploadedLogo(url) ||
        parts.length !== 2 ||
        !parts.every((part) => SAFE_SEGMENT.test(part) && !part.includes(".."))
      ) {
        throw new Error("Not an uploaded logo URL");
      }
      for (const file of filesFor(url)) await rm(file, { force: true });
    },
  };
}

/** Local disk for the dev/prod setup: `apps/erp/public` and `apps/catalog/public`. */
export function localLogoStorage(): LogoStorage {
  const erp = path.join(process.cwd(), "public");
  const catalog = path.resolve(process.cwd(), "../catalog/public");
  return createLocalLogoStorage([erp, catalog]);
}
