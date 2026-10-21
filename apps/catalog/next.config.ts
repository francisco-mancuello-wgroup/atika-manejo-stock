import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import type { NextConfig } from "next";

// Next.js only loads .env files from the app directory; the shared DATABASE_URL lives in the
// repository root .env (gitignored, same file the seed and the ERP use). Existing variables win,
// and a missing file is ignored so builds and production runs rely on the real environment.
config({ path: fileURLToPath(new URL("../../.env", import.meta.url)), quiet: true });

const nextConfig: NextConfig = {
  transpilePackages: ["@atika/ui", "@atika/pricing", "@atika/db"],
  // The dev-only Next.js badge overlaps the page; compile and runtime errors are still shown.
  devIndicators: false,
  // The rows list moved from the site root to /ver-todo; old category links keep working.
  async redirects() {
    return [
      {
        source: "/:categoria(novedades|vestidos|tops|faldas-y-shorts|accesorios)",
        destination: "/ver-todo/:categoria",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
