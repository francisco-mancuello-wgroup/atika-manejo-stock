/** A Next.js `redirects()` rule. */
export interface SiteRedirect {
  source: string;
  destination: string;
  permanent: boolean;
}

/**
 * Rules that send a whole deployment to another origin, keeping the path, when `target` is an
 * http(s) origin (`REDIRECT_TO_ORIGIN`, set only on the old Vercel projects). Unset or invalid
 * adds nothing, so the server the site moved to never redirects to itself. Temporary, so the old
 * links can be pointed elsewhere later.
 */
export function siteRedirects(target: string | undefined): SiteRedirect[] {
  const value = target?.trim();
  if (!value) return [];
  let origin: string;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return [];
    origin = url.origin;
  } catch {
    return [];
  }
  return [
    { source: "/", destination: `${origin}/`, permanent: false },
    { source: "/:path*", destination: `${origin}/:path*`, permanent: false },
  ];
}
