import type { NextConfig } from "next";
import { APP_APK_URL, APP_DOWNLOAD_PATH } from "./src/config/app";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: { formats: ["image/avif", "image/webp"], qualities: [75, 92] },
  async redirects() {
    return [
      // Short, shareable link to the Android app.
      { source: APP_DOWNLOAD_PATH, destination: APP_APK_URL, permanent: false },
      // Name corrected from an earlier misspelling; keep old shared links working.
      { source: "/players/pranjali-suraduse", destination: "/players/pranjali-surduse", permanent: true },
      // The admin's Photo Studio became the Card Maker.
      { source: "/admin/photo-studio", destination: "/admin/card-maker", permanent: true },
    ];
  },
};

export default nextConfig;
