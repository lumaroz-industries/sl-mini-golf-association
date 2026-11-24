import { InstagramHandle } from "@/components/ui/InstagramHandle";
import { ADMIN_VERSION, type TeamMember } from "@/lib/admin/team";
import c from "./credits.module.css";

/** The admin's footer: the same credits as the website footer, plus the admin's own line. */
export function AdminFooter({ owner, dev }: { owner: TeamMember; dev: TeamMember }) {
  const year = new Date().getFullYear();
  return (
    <footer className={c.footer}>
      <div className={c.footerInner}>
        <div className={c.credits}>
          {[owner, dev].map((p) => (
            <div key={p.id} className={c.credit}>
              <span className={c.creditRole}>{p.role}</span>
              <span className={c.creditName} data-dev={p === dev || undefined} data-owner={p === owner || undefined}>
                {p.name}
              </span>
              {p.instagram && <InstagramHandle {...p.instagram} name={p.name} size="sm" />}
            </div>
          ))}
        </div>
        <div className={c.bottom}>
          <span>© {year} SL Mini Golf Association · SL Admin v{ADMIN_VERSION}</span>
          <span>
            Designed &amp; engineered by <b>{dev.name}</b>
          </span>
        </div>
      </div>
      {/* Only in the installed app. */}
      <a className={c.badge} href={dev.instagram?.url ?? "#"} target="_blank" rel="noopener noreferrer" aria-label={`SL Admin, built by ${dev.name}`}>
        <i aria-hidden="true">◆</i> by {dev.name.split(" ")[0]}
      </a>
    </footer>
  );
}
