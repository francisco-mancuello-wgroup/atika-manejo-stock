import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@atika/ui", "@atika/pricing", "@atika/db"],
};

export default nextConfig;
