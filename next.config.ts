import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: { formats: ["image/avif", "image/webp"], qualities: [75, 92] },
  async redirects() {
    return [
      // Name corrected from an earlier misspelling; keep old shared links working.
      { source: "/players/pranjali-suraduse", destination: "/players/pranjali-surduse", permanent: true },
      // The admin's Photo Studio became the Card Maker.
      { source: "/admin/photo-studio", destination: "/admin/card-maker", permanent: true },
    ];
  },
};

export default nextConfig;
