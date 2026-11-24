import { redirect } from "next/navigation";
import { adminConfigured, isSignedIn } from "@/lib/admin/auth";
import { LoginForm } from "@/components/admin/LoginForm";
import s from "@/components/admin/admin.module.css";
import c from "@/components/admin/credits.module.css";
import { getTeam } from "@/lib/admin/team";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ expired?: string }> }) {
  if (await isSignedIn()) redirect("/admin");
  const { expired } = await searchParams;
  const { dev } = await getTeam();
  return (
    <div className={s.login}>
      <div className={s.loginCard}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/slmga-logo-dark.svg" alt="SL Mini Golf Association" />
        <div>
          <p className={s.kicker}>Admin</p>
          <h1 className={s.title} style={{ fontSize: "1.75rem" }}>
            Sign in
          </h1>
        </div>
        {!adminConfigured() ? (
          <p className={s.notice}>
            The admin is not set up yet. Add <code>ADMIN_PASSWORD</code> (at least 8 characters) in Vercel → Settings → Environment Variables, then redeploy.
          </p>
        ) : (
          <LoginForm expired={!!expired} />
        )}
        <p className={c.secure}>
          <span aria-hidden="true">🔒</span> Secure access · Engineered by{" "}
          <a href={dev.instagram?.url ?? "#"} target="_blank" rel="noopener noreferrer">
            {dev.name}
          </a>
        </p>
      </div>
    </div>
  );
}
