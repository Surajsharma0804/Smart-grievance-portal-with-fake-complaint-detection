import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@nagrik-setu/shared'],

  async rewrites() {
    const apiUrl = process.env.API_BASE_URL || 'http://localhost:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/:path*`,
      },
      {
        source: '/staff/:path*',
        destination: '/staff/index.html',
      },
    ];
  },
};

export default nextConfig;
