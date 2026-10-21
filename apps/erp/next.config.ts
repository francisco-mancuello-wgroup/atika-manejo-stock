import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@atika/ui", "@atika/pricing", "@atika/db"],
  // Keep the dev-only Next.js badge away from the sidebar logo.
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
