import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: { formats: ["image/avif", "image/webp"] },
  async redirects() {
    return [
      // Name corrected from an earlier misspelling; keep old shared links working.
      { source: "/players/pranjali-suraduse", destination: "/players/pranjali-surduse", permanent: true },
    ];
  },
};

export default nextConfig;
