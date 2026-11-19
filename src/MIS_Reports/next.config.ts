import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  allowedDevOrigins: ['127.0.0.1', 'localhost', '*.*.*.*'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  experimental: {
    staleTimes: { dynamic: 0 },
    optimizePackageImports: ['lucide-react', 'recharts', 'radix-ui', 'sonner'],
  },
};

export default nextConfig;
