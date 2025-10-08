import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.outrank.so',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
