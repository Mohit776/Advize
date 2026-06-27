/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent browsers from caching HTML pages so updates are always visible
  // without a hard-refresh. Next.js already sets immutable cache on /_next/static/*
  async headers() {
    return [
      {
        // Apply to all page routes (not static assets)
        source: '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        port: '',
        pathname: '**',
      },
      // Instagram CDN domains for Apify-scraped post images
      {
        protocol: 'https',
        hostname: '**.cdninstagram.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '**.instagram.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'instagram.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '**.fbcdn.net',
        port: '',
        pathname: '**',
      },
    ],
  },
};

export default nextConfig;
