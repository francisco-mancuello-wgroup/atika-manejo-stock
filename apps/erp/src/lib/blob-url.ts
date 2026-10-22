/** Public Vercel Blob URLs: `https://<store>.public.blob.vercel-storage.com/<pathname>`. */
const PUBLIC_BLOB_URL = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/(.+)$/i;

/** The pathname inside the blob store, or null when `url` is not a public Vercel Blob URL. */
export function blobPathname(url: string): string | null {
  return PUBLIC_BLOB_URL.exec(url)?.[1] ?? null;
}
