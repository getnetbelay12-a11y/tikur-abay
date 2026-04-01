import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typedRoutes: false,
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  experimental: {
    devtoolSegmentExplorer: false,
  },
};

export default nextConfig;
