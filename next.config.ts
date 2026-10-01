import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  turbopack: {},
  devIndicators: {
    // Next 16: buildActivity is removed, just pass an empty object or position if needed
    position: "top-left",
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    // Catatan: /_next/static/* sengaja tidak di-override di sini karena
    // Next.js sudah serve immutable by default; override bisa bikin stale saat dev.
    // Edge caching untuk static diatur via vercel.json (prod).
    return [
      {
        source: "/logo.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=86400, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/icon.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=86400, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=86400, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/dashboard",
        permanent: false,
      },
    ];
  },
};

export default withSerwist(nextConfig);
