import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import type { NextConfig } from "next";
import { siteRedirects } from "../../packages/ui/src/lib/site-redirect";

// Next.js only loads .env files from the app directory; the shared DATABASE_URL lives in the
// repository root .env (gitignored, same file the seed and the ERP use). Existing variables win,
// and a missing file is ignored so builds and production runs rely on the real environment.
config({ path: fileURLToPath(new URL("../../.env", import.meta.url)), quiet: true });

const nextConfig: NextConfig = {
  transpilePackages: ["@atika/ui", "@atika/pricing", "@atika/db"],
  // Photos and logos uploaded from the ERP live in Vercel Blob (the server disk is not kept).
  images: {
    // With MEDIA_DIR (VPS) photos are runtime uploads that the web server serves from disk, but the
    // image optimizer fetches `/media/...` from Next itself, which only knows the `public/` files
    // present at build time (uploads would 404). They are already shrunk to webp before upload.
    unoptimized: Boolean(process.env.MEDIA_DIR?.trim()),
    remotePatterns: ["products", "banks", "brands"].map((folder) => ({
      protocol: "https" as const,
      hostname: "*.public.blob.vercel-storage.com",
      pathname: `/${folder}/uploads/**`,
    })),
  },
  // The dev-only Next.js badge overlaps the page; compile and runtime errors are still shown.
  devIndicators: false,
  // The rows list moved from the site root to /ver-todo; old category links keep working.
  async redirects() {
    return [
      // On the old Vercel project REDIRECT_TO_ORIGIN sends everything to the server it moved to.
      ...siteRedirects(process.env.REDIRECT_TO_ORIGIN),
      {
        source: "/:categoria(novedades|vestidos|tops|faldas-y-shorts|accesorios)",
        destination: "/ver-todo/:categoria",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
