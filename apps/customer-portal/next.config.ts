import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  allowedDevOrigins: [
    'http://127.0.0.1:6011',
    'http://localhost:6011',
    'http://127.0.0.1:6010',
    'http://localhost:6010',
  ],
};

export default nextConfig;
