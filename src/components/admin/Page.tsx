import Link from "next/link";
import s from "./admin.module.css";

export function PageHead({ kicker, title, lede, action }: { kicker: string; title: string; lede?: string; action?: { href: string; label: string } }) {
  return (
    <div className={s.head}>
      <div>
        <p className={s.kicker}>{kicker}</p>
        <h1 className={s.title}>{title}</h1>
        {lede && <p className={s.lede}>{lede}</p>}
      </div>
      {action && (
        <Link href={action.href} className={`${s.btn} ${s.primary}`}>
          {action.label}
        </Link>
      )}
    </div>
  );
}

/** Runs a content read and turns setup problems into a readable notice. */
export async function attempt<T>(fn: () => Promise<T>): Promise<{ data: T; error?: undefined } | { data?: undefined; error: string }> {
  try {
    return { data: await fn() };
  } catch (e) {
    const m = (e as Error).message;
    return { error: m === "not-found" ? "The repository or branch was not found — check ADMIN_GITHUB_REPO and ADMIN_GITHUB_BRANCH in Vercel." : m };
  }
}

export function SetupNotice({ children }: { children: React.ReactNode }) {
  return <div className={s.notice}>{children}</div>;
}

export function StatusPill({ draft, invalid }: { draft: boolean; invalid?: boolean }) {
  if (invalid) return <span className={`${s.pill} ${s.pillWarn}`}>Needs fixing</span>;
  return draft ? <span className={`${s.pill} ${s.pillDraft}`}>Draft</span> : <span className={`${s.pill} ${s.pillLive}`}>Live</span>;
}

export const formatDate = (d: string) => {
  const t = Date.parse(`${d}T00:00:00Z`);
  return Number.isNaN(t) ? d : new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
};
