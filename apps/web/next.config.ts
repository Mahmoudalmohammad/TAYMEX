import type { NextConfig } from 'next';
const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@engineering-platform/ui',
    '@engineering-platform/app-shell',
    '@engineering-platform/ui-patterns'
  ]
};
export default config;
