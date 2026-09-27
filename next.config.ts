import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    // Post images, event banners and coach offer banners all come from URLs
    // stored in the database or entered by a user, so the host is not known at
    // build time. Without this, next/image throws
    // "hostname is not configured under images" and takes the whole page down.
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
};

export default nextConfig;
