import type { MetadataRoute } from "next";
import { getSiteSettings } from "@/content/repository";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const site = await getSiteSettings();
  return {
    name: site.name,
    short_name: "SL Mini Golf",
    description: site.description,
    start_url: "/",
    display: "standalone",
    background_color: "#050807",
    theme_color: "#050807",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
