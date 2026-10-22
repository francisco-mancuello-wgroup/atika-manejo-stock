import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
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
  return {
    async saveBankLogo(bankId, fileName, bytes) {
      assertSafe(bankId, "bank id");
      assertSafe(fileName, "file name");
      const url = `${LOGOS_PREFIX}${bankId}/${fileName}`;
      for (const dir of publicDirs) {
        const file = path.join(dir, url);
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, bytes);
      }
      return url;
    },
    async deleteBankLogo(url) {
      const parts = url.slice(LOGOS_PREFIX.length).split("/");
      if (
        !isUploadedLogo(url) ||
        parts.length !== 2 ||
        !parts.every((part) => SAFE_SEGMENT.test(part) && !part.includes(".."))
      ) {
        throw new Error("Not an uploaded logo URL");
      }
      for (const dir of publicDirs) await rm(path.join(dir, url), { force: true });
    },
  };
}

/** Local disk for the dev/prod setup: `apps/erp/public` and `apps/catalog/public`. */
export function localLogoStorage(): LogoStorage {
  const erp = path.join(process.cwd(), "public");
  const catalog = path.resolve(process.cwd(), "../catalog/public");
  return createLocalLogoStorage([erp, catalog]);
}
