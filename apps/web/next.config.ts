import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: { useTypeScriptCli: true },
  poweredByHeader: false,
};

export default nextConfig;
