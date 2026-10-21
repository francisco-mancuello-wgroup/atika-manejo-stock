import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import type { NextConfig } from "next";

// Next.js only loads .env files from the app directory; the shared DATABASE_URL lives in the
// repository root .env (gitignored, same file the seed uses). Existing variables win, and a
// missing file is ignored so builds and production runs rely on the real environment.
config({ path: fileURLToPath(new URL("../../.env", import.meta.url)), quiet: true });

const nextConfig: NextConfig = {
  transpilePackages: ["@atika/ui", "@atika/pricing", "@atika/db"],
  // Keep the dev-only Next.js badge away from the sidebar logo.
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
