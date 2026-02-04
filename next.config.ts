import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_API_URL || 'https://aicountingapi.xynotechmm.online/api/v1'}/:path*`,
      },
    ];
  },
};

export default nextConfig;
