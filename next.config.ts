import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
        ],
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 414, 640, 768, 1024, 1280],
    imageSizes: [48, 64, 96, 128, 200, 256, 384, 512],
    minimumCacheTTL: 60 * 60 * 24 * 7,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 't3.storageapi.dev',
      },
      {
        protocol: 'https',
        hostname: '*.t3.storageapi.dev',
      },
      {
        protocol: 'https',
        hostname: '*.up.railway.app',
      },
    ],
  },
};

export default nextConfig;
