import { redirect } from "next/navigation";
import { isSignedIn } from "@/lib/admin/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminFooter } from "@/components/admin/AdminFooter";
import { getTeam } from "@/lib/admin/team";
import s from "@/components/admin/admin.module.css";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!(await isSignedIn())) redirect("/admin/login");
  const { owner, dev } = await getTeam();
  return (
    <>
      <AdminNav signature={{ name: dev.name, url: dev.instagram?.url }} />
      <main className={s.main}>{children}</main>
      <AdminFooter owner={owner} dev={dev} />
    </>
  );
}
