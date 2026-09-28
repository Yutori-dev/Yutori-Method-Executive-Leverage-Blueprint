import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Next's default is 1MB, which silently capped admin file uploads and
      // would cap CSV imports. Vercel itself rejects request bodies over
      // ~4.5MB, so 4MB is the practical ceiling.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
