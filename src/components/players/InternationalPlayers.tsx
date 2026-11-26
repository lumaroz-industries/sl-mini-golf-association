import { WorldWall, type WallPlayer } from "./WorldWall";
import hero from "@/components/hero/Hero.module.css";
import s from "./International.module.css";

/** The International players section: a heading, then the wall of cards. */
export function InternationalPlayers({
  players,
  kicker,
  heading,
  intro,
  emptyBody,
  revealLabel,
}: {
  players: WallPlayer[];
  kicker: string;
  heading: string;
  intro: string;
  emptyBody: string;
  revealLabel: string;
}) {
  const words = heading.trim().split(/\s+/);
  const last = words.pop();
  return (
    <section className={s.section} id="international" aria-labelledby="international-title">
      <div className={s.glow} aria-hidden="true" />
      <header className={`container ${s.head}`}>
        <span className={s.kicker}>
          <i aria-hidden="true">◆</i>
          {kicker}
          {players.length > 0 && <span className={s.count}>{players.length}</span>}
        </span>
        <h2 id="international-title" className={s.title}>
          {words.join(" ")} <span className={hero.outline}>{last}</span>
        </h2>
        <p className={s.intro}>{intro}</p>
      </header>
      <div className="container">
        <WorldWall players={players} revealLabel={revealLabel} />
        {players.length === 0 && <p className={s.emptyBody}>{emptyBody}</p>}
      </div>
    </section>
  );
}
