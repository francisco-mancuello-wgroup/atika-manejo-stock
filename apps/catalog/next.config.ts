import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@atika/ui", "@atika/pricing"],
  // The dev-only Next.js badge overlaps the page; compile and runtime errors are still shown.
  devIndicators: false,
};

export default nextConfig;
