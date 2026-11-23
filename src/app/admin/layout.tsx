import type { Metadata } from "next";
import s from "@/components/admin/admin.module.css";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s — Admin" },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className={s.shell}>{children}</div>;
}
