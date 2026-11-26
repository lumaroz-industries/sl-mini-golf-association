import s from "./Hero.module.css";

/**
 * Updates hero visual: a golf-scoreboard "news desk" — a black LED panel with
 * a live dot, glowing counts per kind of update and a ticker of the latest
 * headlines.
 */
export function NewsDesk({ rows, headlines }: { rows: Array<{ label: string; count: number }>; headlines: string[] }) {
  const ticker = headlines.length ? headlines : ["First update coming soon", "Tournaments · results · announcements", "Follow the community on social media"];
  return (
    <div className={s.desk} aria-hidden="true">
      <span className={s.deskGlow} />
      <div className={s.board}>
        <span className={s.screws} />
        <div className={s.boardHead}>
          <span className={s.live}>
            <i />
            Live
          </span>
          <span className={s.boardTitle}>SL · News desk</span>
        </div>
        <ul className={s.rows}>
          {rows.map((r) => (
            <li key={r.label} className={s.row}>
              <span>{r.label}</span>
              <b className={s.led}>{String(r.count).padStart(2, "0")}</b>
            </li>
          ))}
        </ul>
        <div className={s.ticker}>
          <span className={s.tickerTrack}>
            {[...ticker, ...ticker].map((h, i) => (
              <span key={i}>
                <i>◆</i>
                {h}
              </span>
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
