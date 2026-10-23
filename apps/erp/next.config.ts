import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import type { NextConfig } from "next";

// Next.js only loads .env files from the app directory; the shared DATABASE_URL lives in the
// repository root .env (gitignored, same file the seed uses). Existing variables win, and a
// missing file is ignored so builds and production runs rely on the real environment.
config({ path: fileURLToPath(new URL("../../.env", import.meta.url)), quiet: true });

const nextConfig: NextConfig = {
  transpilePackages: ["@atika/ui", "@atika/pricing", "@atika/db"],
  // Photos and logos uploaded from the ERP live in Vercel Blob (the server disk is not kept).
  images: {
    // With MEDIA_DIR (VPS) photos are runtime uploads that the web server serves from disk, but the
    // image optimizer fetches `/media/...` from Next itself, which only knows the `public/` files
    // present at build time (uploads would 404). They are already shrunk to webp before upload.
    unoptimized: Boolean(process.env.MEDIA_DIR?.trim()),
    remotePatterns: ["products", "banks"].map((folder) => ({
      protocol: "https" as const,
      hostname: "*.public.blob.vercel-storage.com",
      pathname: `/${folder}/uploads/**`,
    })),
  },
  // The dev-only Next.js badge covers the sidebar logo (its position is user-draggable and
  // persisted per browser), so hide it; compile and runtime errors are still shown.
  devIndicators: false,
  // Product photos are uploaded through Server Actions (up to 10 MB each, several per save).
  experimental: { serverActions: { bodySizeLimit: "50mb" } },
  // Discounts moved under Promos; old links keep working.
  async redirects() {
    return [
      { source: "/descuentos/:path*", destination: "/promos/descuentos/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
