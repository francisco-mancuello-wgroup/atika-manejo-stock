import { getDb } from "../../../lib/db";

export const dynamic = "force-dynamic";

/**
 * Current catalog version, bumped by the ERP on every save the catalog shows. Open pages poll it
 * (LiveRefresh). The browser never caches it; the CDN keeps it ~2 s so any number of viewers
 * costs about one database read per window.
 */
export async function GET(): Promise<Response> {
  const row = await getDb().catalogVersion.findUnique({ where: { id: 1 } });
  return Response.json(
    { version: row?.version ?? 0 },
    {
      headers: {
        "Cache-Control": "no-store",
        "CDN-Cache-Control": "public, s-maxage=2, stale-while-revalidate=5",
      },
    },
  );
}
