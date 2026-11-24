/**
 * "SL Admin" as an installable app: Chrome's "Install app", iPhone's "Add to
 * Home Screen", and the Android APK (which opens this same live page, so any
 * change to the admin reaches the app without reinstalling it).
 */
export const dynamic = "force-static";

export function GET() {
  return Response.json(
    {
      id: "/admin",
      name: "SL Admin",
      short_name: "SL Admin",
      description: "Post and edit updates, articles and gallery albums for SL Mini Golf Association.",
      start_url: "/admin",
      scope: "/admin",
      display: "standalone",
      orientation: "any",
      background_color: "#050807",
      theme_color: "#050807",
      icons: [
        { src: "/brand/admin-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/brand/admin-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/brand/admin-icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
