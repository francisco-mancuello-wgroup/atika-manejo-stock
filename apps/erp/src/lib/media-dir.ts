import path from "node:path";

/** URL prefix of every stored media file; `MEDIA_DIR` is the folder served under it. */
export const MEDIA_URL_PREFIX = "/media/";

/**
 * The server folder behind the `/media` URL prefix (VPS: `/var/lib/atika/media`, served by
 * Caddy), or null when `MEDIA_DIR` is unset or blank. A file for the URL `/media/x/y` lives at
 * `${MEDIA_DIR}/x/y`.
 */
export function mediaDir(): string | null {
  const dir = process.env.MEDIA_DIR?.trim();
  return dir ? path.resolve(dir) : null;
}

/** The file inside `mediaDir` for a `/media/...` URL (the caller has validated the URL). */
export function mediaFile(dir: string, url: string): string {
  return path.join(dir, url.slice(MEDIA_URL_PREFIX.length));
}
