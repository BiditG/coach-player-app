import type { NextConfig } from 'next';

const imageHosts = [process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.R2_PUBLIC_URL]
  .flatMap(value => {
    if (!value) return [];
    try {
      return [new URL(value).hostname];
    } catch {
      return [];
    }
  });

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    remotePatterns: imageHosts.map(hostname => ({
      protocol: 'https' as const,
      hostname,
      pathname: '/**',
    })),
  },
};

export default nextConfig;
