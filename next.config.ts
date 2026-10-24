import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" is only for self-hosting/sandbox. On Vercel the platform
  // handles the output itself and standalone can break the deployment.
  output: process.env.VERCEL ? undefined : "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
