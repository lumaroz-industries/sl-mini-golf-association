import type { Metadata, Viewport } from "next";
import { AdminIntro } from "@/components/admin/AdminIntro";
import { getPeople } from "@/content/repository";
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

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const people = await getPeople();
  return (
    <div className={s.shell}>
      <AdminIntro people={people.map((p) => ({ name: p.name, role: p.role, portrait: p.portrait?.src }))} />
      {children}
    </div>
  );
}
