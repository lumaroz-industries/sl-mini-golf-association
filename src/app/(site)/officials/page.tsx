import type { Metadata } from "next";
import { findNavItem } from "@/config/navigation";
import { getOfficialsPageContent } from "@/content/repository";
import { OutlinedTitle } from "@/components/hero/OutlinedTitle";
import { OfficialCard } from "@/components/officials/OfficialCard";
import s from "@/components/officials/Officials.module.css";

const item = findNavItem("/officials");

export const metadata: Metadata = {
  title: item.label,
  description: item.summary,
  alternates: { canonical: "/officials" },
};

export default async function OfficialsPage() {
  const content = await getOfficialsPageContent();
  const levels = content.levels.map((lv) => {
    const list = content.officials.filter((o) => o.level === lv.id);
    return { ...lv, list, count: list.length };
  });

  return (
    <div className={s.page}>
      <div className={s.glow} aria-hidden="true" />

      <div className={`container ${s.hero}`}>
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

            <ul className={s.grid}>
              {lv.list.length > 0
                ? lv.list.map((o, i) => (
                    <li key={o.id} style={{ "--i": i } as React.CSSProperties}>
                      <OfficialCard official={o} revealLabel={content.revealLabel} />
                    </li>
                  ))
                : Array.from({ length: lv.placeholders }, (_, i) => (
                    <li key={i} style={{ "--i": i } as React.CSSProperties} aria-hidden={i > 0 || undefined}>
                      <OfficialCard revealLabel={content.revealLabel} role="Official" />
                    </li>
                  ))}
            </ul>
          </div>
        </section>
      ))}

      {content.note && <p className={`container ${s.note}`}>{content.note}</p>}
    </div>
  );
}
