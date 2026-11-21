"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./Articles.module.css";

interface ArticleBrowserProps {
  allLabel: string;
  categories: Array<{ id: string; label: string; count: number }>;
  /** Server-rendered cards with their category, in display order. */
  items: Array<{ slug: string; category: string; card: React.ReactNode }>;
  pageSize?: number;
}

/**
 * Category chips + card grid + "Show more". Filtering is instant and kept in
 * the URL (?category=…) so filtered views can be shared. Without JavaScript
 * every card is simply shown.
 */
export function ArticleBrowser({ allLabel, categories, items, pageSize = 12 }: ArticleBrowserProps) {
  const [active, setActive] = useState<string>("all");
  const [visible, setVisible] = useState(pageSize);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("category");
    if (fromUrl && categories.some((c) => c.id === fromUrl)) setActive(fromUrl);
  }, [categories]);

  const select = (id: string) => {
    setActive(id);
    setVisible(pageSize);
    const url = new URL(window.location.href);
    if (id === "all") url.searchParams.delete("category");
    else url.searchParams.set("category", id);
    window.history.replaceState(null, "", url);
  };

  const filtered = useMemo(() => (active === "all" ? items : items.filter((i) => i.category === active)), [active, items]);
  const shown = filtered.slice(0, visible);

  return (
    <div className={styles.browser}>
      <div className={styles.chips} role="toolbar" aria-label="Filter articles by category">
        {[{ id: "all", label: allLabel, count: items.length }, ...categories].map((c) => (
          <button key={c.id} type="button" className={styles.filter} aria-pressed={active === c.id} onClick={() => select(c.id)} disabled={c.count === 0}>
            {c.label}
            <span className={styles.filterCount}>{c.count}</span>
          </button>
        ))}
      </div>

      <p className="visually-hidden" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? "article" : "articles"} shown
      </p>

      <ul className={styles.grid}>
        {shown.map((i, n) => (
          <li key={i.slug} className={styles.cell} style={{ "--i": n % pageSize } as React.CSSProperties}>
            {i.card}
          </li>
        ))}
      </ul>

      {filtered.length > visible && (
        <button type="button" className={styles.more} onClick={() => setVisible((v) => v + pageSize)}>
          Show more articles <span aria-hidden="true">↓</span>
        </button>
      )}
    </div>
  );
}
