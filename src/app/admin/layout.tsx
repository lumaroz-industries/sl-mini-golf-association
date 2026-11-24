import type { Metadata, Viewport } from "next";
import s from "@/components/admin/admin.module.css";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s — Admin" },
  robots: { index: false, follow: false, nocache: true },
  // Installable as its own app ("SL Admin"), separate from the public site.
  manifest: "/admin/manifest.webmanifest",
  applicationName: "SL Admin",
  appleWebApp: { capable: true, title: "SL Admin", statusBarStyle: "black-translucent" },
  icons: { apple: "/brand/admin-apple-icon.png" },
};

export const viewport: Viewport = { themeColor: "#050807", viewportFit: "cover" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className={s.shell}>{children}</div>;
}
