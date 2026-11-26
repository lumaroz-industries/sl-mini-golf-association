import type { Metadata } from "next";
import { findNavItem } from "@/config/navigation";
import { getOfficialsPageContent } from "@/content/repository";
import { OutlinedTitle } from "@/components/hero/OutlinedTitle";
import { OfficialCard } from "@/components/officials/OfficialCard";
import hero from "@/components/hero/Hero.module.css";
import s from "@/components/officials/Officials.module.css";

const item = findNavItem("/officials");

export const metadata: Metadata = {
  title: item.label,
  description: item.summary,
  alternates: { canonical: "/officials" },
};

/** A golf flag, the board's emblem. */
function Flag() {
  return (
    <svg viewBox="0 0 32 40" width="30" height="38" aria-hidden="true">
      <path d="M8 38V3" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M9 3.5l18 6.5-18 6.5z" fill="currentColor" />
      <ellipse cx="8" cy="38" rx="6" ry="1.6" fill="currentColor" opacity="0.45" />
    </svg>
  );
}

export default async function OfficialsPage() {
  const content = await getOfficialsPageContent();
  const levels = content.levels.map((lv) => {
    const groups = lv.groups.map((g) => ({ ...g, list: content.officials.filter((o) => o.level === lv.id && o.group === g.id) }));
    return { ...lv, groups, count: groups.reduce((n, g) => n + g.list.length, 0) };
  });
  const total = content.officials.length;

  return (
    <div className={s.page}>
      <div className={s.glow} aria-hidden="true" />

      <div className={`container ${hero.split} ${s.hero}`}>
        <header className={s.header}>
          <span className="kicker">{content.kicker}</span>
          <OutlinedTitle text={content.heading} className={s.title} />
          <p className={s.intro}>{content.intro}</p>
          <nav className={s.jump} aria-label="Officials by level">
            {levels.map((lv) => (
              <a key={lv.id} href={`#level-${lv.id}`} className={s.jumpLink} data-accent={lv.accent}>
                <i aria-hidden="true" />
                {lv.title}
                <b>{lv.count}</b>
              </a>
            ))}
          </nav>
        </header>

        {/* A golf clubhouse honours board: every level and group, engraved in gold. */}
        <div className={s.board} aria-hidden="true">
          <span className={s.boardCrest}>
            <Flag />
          </span>
          <span className={s.boardTitle}>Honours board</span>
          <span className={s.boardRule} />
          {levels.map((lv) => (
            <div key={lv.id} className={s.boardLevel} data-accent={lv.accent}>
              <span className={s.boardLevelName}>{lv.title}</span>
              <ol className={s.boardList}>
                {lv.groups.map((g) => (
                  <li key={g.id}>
                    <b>{g.title}</b>
                    <i>{g.list.length || "—"}</i>
                  </li>
                ))}
              </ol>
            </div>
          ))}
          <span className={s.boardFoot}>
            {total} {total === 1 ? "official" : "officials"}
          </span>
        </div>
      </div>

      {levels.map((lv, li) => (
        <section key={lv.id} id={`level-${lv.id}`} className={s.level} data-accent={lv.accent} aria-labelledby={`level-title-${lv.id}`}>
          <div className="container">
            <header className={s.levelHead}>
              <span className={s.levelNo} aria-hidden="true">
                {String(li + 1).padStart(2, "0")}
              </span>
              <div>
                <span className={s.levelSub}>{lv.subtitle}</span>
                <h2 id={`level-title-${lv.id}`} className={s.levelTitle}>
                  {lv.title}
                </h2>
                {lv.note && <p className={s.levelNote}>{lv.note}</p>}
                {lv.organisation &&
                  (lv.organisation.url ? (
                    <a className={s.orgBadge} href={lv.organisation.url} target="_blank" rel="noopener noreferrer">
                      {lv.organisation.short && <b>{lv.organisation.short}</b>}
                      {lv.organisation.name} <span aria-hidden="true">↗</span>
                    </a>
                  ) : (
                    <span className={s.orgBadge}>
                      {lv.organisation.short && <b>{lv.organisation.short}</b>}
                      {lv.organisation.name}
                    </span>
                  ))}
              </div>
              <span className={s.levelBand} aria-hidden="true" />
            </header>

            {lv.groups.map((g) => (
              <div key={g.id} className={s.group}>
                <header className={s.groupHead}>
                  <h3 className={s.groupTitle}>{g.title}</h3>
                  {g.note && <p className={s.groupNote}>{g.note}</p>}
                </header>
                <ul className={s.grid} data-lead={g.id === "leadership" || undefined}>
                  {g.list.length > 0
                    ? g.list.map((o, i) => (
                        <li key={o.id} style={{ "--i": i } as React.CSSProperties}>
                          <OfficialCard official={o} revealLabel={content.revealLabel} />
                        </li>
                      ))
                    : Array.from({ length: g.placeholders }, (_, i) => (
                        <li key={i} style={{ "--i": i } as React.CSSProperties} aria-hidden={i > 0 || undefined}>
                          <OfficialCard revealLabel={content.revealLabel} role={g.title} />
                        </li>
                      ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}

      {content.note && <p className={`container ${s.note}`}>{content.note}</p>}
    </div>
  );
}
