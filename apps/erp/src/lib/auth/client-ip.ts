/**
 * Client address for rate limiting. Behind a reverse proxy the first `x-forwarded-for` hop is the
 * client; without one the header is client-controlled, so the per-email limit stays the real guard.
 */
export function clientIpFrom(get: (name: string) => string | null): string {
  const forwarded = get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || get("x-real-ip")?.trim() || "unknown";
}
