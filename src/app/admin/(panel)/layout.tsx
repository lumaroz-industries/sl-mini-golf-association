import { redirect } from "next/navigation";
import { isSignedIn } from "@/lib/admin/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import s from "@/components/admin/admin.module.css";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!(await isSignedIn())) redirect("/admin/login");
  return (
    <>
      <AdminNav />
      <main className={s.main}>{children}</main>
    </>
  );
}
