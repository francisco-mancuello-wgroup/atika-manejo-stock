import { del, put } from "@vercel/blob";
import { blobPathname } from "./blob-url";

/** The two blob operations the uploads need, so tests can fake the store. */
export interface BlobClient {
  /** Stores `bytes` at `pathname` (public) and returns its URL. */
  put(pathname: string, bytes: Uint8Array, contentType: string): Promise<string>;
  del(url: string): Promise<void>;
}

const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function assertSafe(value: string, what: string) {
  if (!SAFE_SEGMENT.test(value) || value.includes("..")) throw new Error(`Unsafe ${what}`);
}

/**
 * Uploads kept in Vercel Blob under `folder` (`products/uploads/`), one folder per owner id.
 * Files uploaded to local disk before (`localPrefix`) were never in the store, so deleting them
 * is a no-op instead of an error.
 */
export function createBlobUploads(client: BlobClient, folder: string, localPrefix: string) {
  return {
    async save(ownerId: string, fileName: string, bytes: Uint8Array): Promise<string> {
      assertSafe(ownerId, "owner id");
      assertSafe(fileName, "file name");
      return client.put(`${folder}${ownerId}/${fileName}`, bytes, "image/webp");
    },
    async remove(url: string): Promise<void> {
      if (url.startsWith(localPrefix)) return;
      const pathname = blobPathname(url);
      const parts = pathname?.startsWith(folder) ? pathname.slice(folder.length).split("/") : [];
      if (
        parts.length !== 2 ||
        !parts.every((part) => SAFE_SEGMENT.test(part) && !part.includes(".."))
      ) {
        throw new Error("Not an uploaded file URL");
      }
      await client.del(url);
    },
  };
}

/** True when the ERP runs with a Vercel Blob store (production); local disk otherwise. */
export function hasBlobStore(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** The real store, authenticated by `BLOB_READ_WRITE_TOKEN`. */
export function vercelBlobClient(): BlobClient {
  return {
    async put(pathname, bytes, contentType) {
      const blob = await put(pathname, Buffer.from(bytes), {
        access: "public",
        contentType,
        addRandomSuffix: false,
      });
      return blob.url;
    },
    del: (url) => del(url),
  };
}
