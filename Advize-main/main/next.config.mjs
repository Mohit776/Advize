/** @type {import('next').NextConfig} */
const nextConfig = {
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
