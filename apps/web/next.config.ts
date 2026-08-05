import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@hostingit/dokploy-client"],
  output: "standalone",
};

export default nextConfig;
