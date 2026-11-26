import type { Metadata, Viewport } from "next";
import { AdminIntro } from "@/components/admin/AdminIntro";
import { getPeopleByIds, getPeopleStyle, getSiteSettings } from "@/content/repository";
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
  // The founder (gold) and the website's designer (diamond), full cut-outs as on the website.
  const site = await getSiteSettings();
  const [[owner, dev], style] = await Promise.all([getPeopleByIds([site.credits.ownerId, site.credits.developerId]), getPeopleStyle()]);
  const people = [
    { name: owner.name, role: owner.role, photo: style[owner.id]?.cutout?.src ?? owner.portrait?.src, finish: "gold" as const },
    { name: dev.name, role: dev.role, photo: style[dev.id]?.cutout?.src ?? dev.portrait?.src, finish: "diamond" as const },
  ];
  return (
    <div className={s.shell}>
      <AdminIntro people={people} />
      {children}
    </div>
  );
}
