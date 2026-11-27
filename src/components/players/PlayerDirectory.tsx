"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { useUrlState } from "@/components/ui/useUrlState";
import b from "@/components/ui/Browse.module.css";
import { MedalIcon, type MedalKind } from "./MedalDefs";
import styles from "./Directory.module.css";

export interface DirectoryPlayer {
  slug: string;
  name: string;
  initials: string;
  gender?: "female" | "male";
  district?: string;
  photo?: string;
  medals: { gold?: number; silver?: number; bronze?: number };
  total: number;
  /** The player's level — their card type, set by the admins (State, National or International). */
  level: "state" | "national" | "international";
  /** Every result, reduced to what the filters need. */
  results: Array<{ level: string; year: number; medal?: string }>;
  topSeven: boolean;
}

const LEVELS = [
  { id: "international", label: "International" },
  { id: "national", label: "National" },
  { id: "state", label: "State" },
];
const SORTS = { name: "Name A–Z", medals: "Most medals", gold: "Most golds", recent: "Most recent result" } as const;
type Sort = keyof typeof SORTS;
const KINDS: MedalKind[] = ["gold", "silver", "bronze"];

/**
 * The Maharashtra player directory: search, filters (level, gender) and sorting — all kept in the URL so a view can be shared.
 */
export function PlayerDirectory({ players, heading, intro, kicker, emptyHeading, emptyBody }: { players: DirectoryPlayer[]; heading: string; intro: string; kicker: string; emptyHeading: string; emptyBody: string }) {
  const [q, setQ] = useUrlState<string>("q", "", () => true);
  const [level, setLevel] = useUrlState<string>("level", "all", (v) => LEVELS.some((l) => l.id === v));
  const [gender, setGender] = useUrlState<string>("gender", "all", (v) => v === "female" || v === "male");
  const [sort, setSort] = useUrlState<Sort>("sort", "name", (v) => v in SORTS);

  const shown = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const list = players.filter((p) => {
      if (words.length && !words.every((w) => `${p.name} ${p.district ?? ""}`.toLowerCase().includes(w))) return false;
      if (gender !== "all" && p.gender !== gender) return false;
      // Level: the player's card level, or any result at that level.
      if (level !== "all" && p.level !== level && !p.results.some((r) => r.level === level)) return false;
      return true;
    });
    const latest = (p: DirectoryPlayer) => Math.max(0, ...p.results.map((r) => r.year));
    const by: Record<Sort, (x: DirectoryPlayer, y: DirectoryPlayer) => number> = {
      name: (x, y) => x.name.localeCompare(y.name),
      medals: (x, y) => y.total - x.total || x.name.localeCompare(y.name),
      gold: (x, y) => (y.medals.gold ?? 0) - (x.medals.gold ?? 0) || y.total - x.total || x.name.localeCompare(y.name),
      recent: (x, y) => latest(y) - latest(x) || x.name.localeCompare(y.name),
    };
    return list.sort(by[sort]);
  }, [players, q, level, gender, sort]);

  const filtered = q || level !== "all" || gender !== "all";
  const reset = () => {
    setQ("");
    setLevel("all");
    setGender("all");
  };

  return (
    <section className={`container ${styles.section}`} aria-labelledby="directory-title">
      <header className={styles.head}>
        <span className={styles.kicker}>{kicker}</span>
        <h2 id="directory-title" className={styles.title}>
          {heading}
        </h2>
        <p className={styles.intro}>{intro}</p>
      </header>

      <div className={b.toolbar}>
        <label className={b.search}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input type="search" value={q} placeholder="Search players or districts" aria-label="Search players" onChange={(e) => setQ(e.target.value)} />
          {q && (
            <button type="button" className={b.clear} aria-label="Clear search" onClick={() => setQ("")}>
              ✕
            </button>
          )}
        </label>
        <label className={b.select}>
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            {Object.entries(SORTS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <span className={b.result} aria-live="polite">
          {shown.length} {shown.length === 1 ? "player" : "players"}
        </span>
      </div>

      <div className={styles.filters} role="group" aria-label="Filters">
        <div className={styles.levels} role="toolbar" aria-label="Level">
          {[{ id: "all", label: "All levels" }, ...LEVELS].map((l) => {
            const n = l.id === "all" ? players.length : players.filter((p) => p.level === l.id || p.results.some((r) => r.level === l.id)).length;
            return (
              <button key={l.id} type="button" className={styles.level} data-level={l.id} aria-pressed={level === l.id} onClick={() => setLevel(l.id)}>
                {l.label}
                <span className={styles.count}>{n}</span>
              </button>
            );
          })}
        </div>
        <div className={styles.selects}>
          <label className={b.select}>
            Gender
            <select value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="all">All</option>
              <option value="female">Women</option>
              <option value="male">Men</option>
            </select>
          </label>
          {filtered && (
            <button type="button" className={styles.reset} onClick={reset}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className={b.noResults}>
          <p>
            <b>{emptyHeading}.</b> {emptyBody}
          </p>
          <button type="button" onClick={reset}>
            Show all players
          </button>
        </div>
      ) : (
        <ul className={styles.grid}>
          {shown.map((p, i) => {
            const best = LEVELS.find((l) => l.id === p.level);
            return (
              <li key={p.slug} className={styles.cell} style={{ "--i": i % 12 } as React.CSSProperties}>
                <Link href={`/players/${p.slug}`} className={styles.card}>
                  <span className={styles.photo}>
                    {p.photo ? <Image src={p.photo} alt="" width={240} height={300} sizes="120px" /> : <span className={styles.initials}>{p.initials}</span>}
                  </span>
                  <span className={styles.body}>
                    <span className={styles.tags}>
                      {p.topSeven && <span className={styles.top7}>Top 7</span>}
                      {best && (
                        <span className={styles.lvl} data-level={best.id}>
                          {best.label}
                        </span>
                      )}
                    </span>
                    <span className={styles.name}>{p.name}</span>
                    <span className={styles.meta}>{[p.district, p.gender === "female" ? "Women" : p.gender === "male" ? "Men" : undefined].filter(Boolean).join(" · ") || "Maharashtra"}</span>
                    <span className={styles.medals} aria-label="Medals">
                      {KINDS.map((k) => (
                        <span key={k} className={styles.medal}>
                          <MedalIcon kind={k} size={16} />
                          <b>{p.medals[k] ?? "–"}</b>
                        </span>
                      ))}
                    </span>
                  </span>
                  <span className={styles.arrow} aria-hidden="true">
                    ↗
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
