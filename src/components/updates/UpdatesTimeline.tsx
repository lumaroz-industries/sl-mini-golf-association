"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./Updates.module.css";

interface TimelineItem {
  slug: string;
  type: string;
  publishedAt: string;
  card: React.ReactNode;
}

interface UpdatesTimelineProps {
  allLabel: string;
  types: Array<{ id: string; label: string; count: number }>;
  items: TimelineItem[];
}

const monthLabel = (iso: string) => {
  const [y, m] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
};

/**
 * The putting-line timeline: newest first, month markers along the line,
 * type filters kept in the URL, and a ball that rolls down the line as you
 * scroll.
 */
export function UpdatesTimeline({ allLabel, types, items }: UpdatesTimelineProps) {
  const [active, setActive] = useState("all");
  const lineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("type");
    if (t && types.some((x) => x.id === t)) setActive(t);
  }, [types]);

  // Ball position follows scroll progress through the timeline.
  useEffect(() => {
    const el = lineRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const anchor = window.innerHeight * 0.45;
      const p = Math.min(1, Math.max(0, (anchor - r.top) / Math.max(1, r.height)));
      el.style.setProperty("--p", p.toFixed(4));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [active]);

  const select = (id: string) => {
    setActive(id);
    const url = new URL(window.location.href);
    if (id === "all") url.searchParams.delete("type");
    else url.searchParams.set("type", id);
    window.history.replaceState(null, "", url);
  };

  const filtered = useMemo(() => (active === "all" ? items : items.filter((i) => i.type === active)), [active, items]);

  // Insert a month marker whenever the month changes.
  const rows: Array<{ kind: "month"; label: string } | { kind: "item"; item: TimelineItem }> = [];
  let last = "";
  for (const item of filtered) {
    const month = item.publishedAt.slice(0, 7);
    if (month !== last) {
      rows.push({ kind: "month", label: monthLabel(item.publishedAt) });
      last = month;
    }
    rows.push({ kind: "item", item });
  }

  return (
    <div className={styles.timelineWrap}>
      {types.length > 0 && (
        <div className={styles.chips} role="toolbar" aria-label="Filter updates by type">
          {[{ id: "all", label: allLabel, count: items.length }, ...types].map((t) => (
            <button key={t.id} type="button" className={styles.filter} aria-pressed={active === t.id} onClick={() => select(t.id)} disabled={t.count === 0}>
              {t.label}
              <span className={styles.filterCount}>{t.count}</span>
            </button>
          ))}
        </div>
      )}
      <p className="visually-hidden" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? "update" : "updates"} shown
      </p>

      <div ref={lineRef} className={styles.timeline}>
        <span className={styles.line} aria-hidden="true" />
        <span className={styles.lineFill} aria-hidden="true" />
        <span className={styles.ball} aria-hidden="true" />
        <ol className={styles.rows}>
          {rows.map((row, i) =>
            row.kind === "month" ? (
              <li key={`m-${row.label}`} className={styles.month} aria-hidden="true">
                <span>{row.label}</span>
              </li>
            ) : (
              <li key={row.item.slug} className={styles.row} style={{ "--i": i } as React.CSSProperties}>
                <span className={styles.marker} aria-hidden="true" />
                {row.item.card}
              </li>
            ),
          )}
        </ol>
        <span className={styles.cup} aria-hidden="true" />
      </div>
    </div>
  );
}
