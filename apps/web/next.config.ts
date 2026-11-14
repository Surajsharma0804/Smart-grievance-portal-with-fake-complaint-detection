import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Proxy staff API calls to Express in development
  async rewrites() {
    return [
      {
        source: '/api/staff/:path*',
        destination: `${process.env.API_BASE_URL || 'http://localhost:4000'}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
