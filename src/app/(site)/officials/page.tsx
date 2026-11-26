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

export default async function OfficialsPage() {
  const content = await getOfficialsPageContent();
  const groups = content.groups.map((g) => ({ ...g, list: content.officials.filter((o) => o.group === g.id) }));
  const total = content.officials.length;

  return (
    <div className={s.page}>
      <div className={s.glow} aria-hidden="true" />

      <div className={`container ${hero.split} ${s.hero}`}>
        <header className={s.header}>
          <span className="kicker">{content.kicker}</span>
          <OutlinedTitle text={content.heading} className={s.title} />
          <p className={s.intro}>{content.intro}</p>
          <p className={hero.stats}>
            <span className={hero.stat}>
              <b>{total}</b> {total === 1 ? "official" : "officials"}
            </span>
            <span className={hero.stat}>
              <b>{groups.length}</b> {groups.length === 1 ? "group" : "groups"}
            </span>
          </p>
        </header>

        {/* A golf clubhouse honours board: the page's groups, engraved in gold. */}
        <div className={s.board} aria-hidden="true">
          <span className={s.boardCrest}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/slmga-icon-dark.svg" alt="" width={84} height={28} />
          </span>
          <span className={s.boardTitle}>Honours board</span>
          <span className={s.boardRule} />
          <ol className={s.boardList}>
            {groups.map((g, i) => (
              <li key={g.id}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <b>{g.title}</b>
                <i>{g.list.length || "—"}</i>
              </li>
            ))}
          </ol>
          <span className={s.boardFoot}>Est. SL Mini Golf Association</span>
        </div>
      </div>

      <div className="container">
        {groups.map((g, gi) => (
          <section key={g.id} className={s.group} aria-labelledby={`officials-${g.id}`}>
            <header className={s.groupHead}>
              <h2 id={`officials-${g.id}`} className={s.groupTitle}>
                <span className={s.groupNo} aria-hidden="true">
                  {String(gi + 1).padStart(2, "0")}
                </span>
                {g.title}
              </h2>
              {g.note && <p className={s.groupNote}>{g.note}</p>}
            </header>
            <ul className={s.grid}>
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
          </section>
        ))}
        {content.note && <p className={s.note}>{content.note}</p>}
      </div>
    </div>
  );
}
