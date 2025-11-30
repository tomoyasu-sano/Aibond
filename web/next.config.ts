import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',

  // Cloud Run compatibility
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
