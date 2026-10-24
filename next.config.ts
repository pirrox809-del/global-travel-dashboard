import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" is only for self-hosting/sandbox. On Vercel the platform
  // handles the output itself and standalone can break the deployment.
  output: process.env.VERCEL ? undefined : "standalone",
  // Ship the committed SQLite database inside the serverless bundle so the
  // runtime fallback in src/lib/db.ts (no DATABASE_URL on Vercel) can find it.
  // Keys are route paths; the glob covers every API route.
  outputFileTracingIncludes: {
    "/api/**/*": ["./db/custom.db"],
    "/": ["./db/custom.db"],
  },
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
