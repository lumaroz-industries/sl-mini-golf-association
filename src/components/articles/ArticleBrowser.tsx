"use client";

import { useMemo, useState } from "react";
import { useUrlState } from "@/components/ui/useUrlState";
import styles from "./Articles.module.css";
import b from "@/components/ui/Browse.module.css";

export interface BrowserArticle {
  slug: string;
  category: string;
  title: string;
  publishedAt: string;
  minutes: number;
  /** Lower-case text searched by the search box (title, excerpt, tags, author). */
  text: string;
  card: React.ReactNode;
}

interface ArticleBrowserProps {
  allLabel: string;
  categories: Array<{ id: string; label: string; description: string }>;
  items: BrowserArticle[];
  /** The featured article, shown large on top of the default view. */
  lead?: { slug: string; card: React.ReactNode };
  pageSize?: number;
}

const SORTS = {
  newest: "Newest first",
  oldest: "Oldest first",
  az: "Title A–Z",
  quick: "Quick reads first",
} as const;
type Sort = keyof typeof SORTS;
const PER_SECTION = 3;

/**
 * Category-wise browsing for articles:
 *  - default ("All", no search): the featured article, then one section per
 *    category (newest three, with "See all"),
 *  - a category, a search or a different sort: one sorted, filtered grid.
 * Category, sort and search are kept in the URL so views can be shared.
 */
export function ArticleBrowser({ allLabel, categories, items, lead, pageSize = 12 }: ArticleBrowserProps) {
  const [active, setActive] = useUrlState<string>("category", "all", (v) => categories.some((c) => c.id === v));
  const [sort, setSort] = useUrlState<Sort>("sort", "newest", (v) => v in SORTS);
  const [query, setQuery] = useUrlState<string>("q", "", () => true);
  const [visible, setVisible] = useState(pageSize);

  const q = query.trim().toLowerCase();
  const sorted = useMemo(() => {
    const list = [...items];
    const by: Record<Sort, (a: BrowserArticle, b: BrowserArticle) => number> = {
      newest: (a, c) => c.publishedAt.localeCompare(a.publishedAt) || a.title.localeCompare(c.title),
      oldest: (a, c) => a.publishedAt.localeCompare(c.publishedAt) || a.title.localeCompare(c.title),
      az: (a, c) => a.title.localeCompare(c.title),
      quick: (a, c) => a.minutes - c.minutes || c.publishedAt.localeCompare(a.publishedAt),
    };
    return list.sort(by[sort]);
  }, [items, sort]);

  const matches = useMemo(() => sorted.filter((i) => (active === "all" || i.category === active) && (!q || q.split(/\s+/).every((w) => i.text.includes(w)))), [sorted, active, q]);
  const grouped = active === "all" && !q && sort === "newest";
  const count = (id: string) => items.filter((i) => i.category === id).length;

  const reset = () => {
    setActive("all");
    setQuery("");
    setSort("newest");
  };

  const grid = (list: BrowserArticle[], offset = 0) => (
    <ul className={styles.grid}>
      {list.map((i, n) => (
        <li key={i.slug} className={styles.cell} style={{ "--i": (n + offset) % pageSize } as React.CSSProperties}>
          {i.card}
        </li>
      ))}
    </ul>
  );

  return (
    <div className={styles.browser}>
      <div className={b.toolbar}>
        <label className={b.search}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input type="search" value={query} placeholder="Search articles" aria-label="Search articles" onChange={(e) => (setQuery(e.target.value), setVisible(pageSize))} />
          {query && (
            <button type="button" className={b.clear} aria-label="Clear search" onClick={() => setQuery("")}>
              ✕
            </button>
          )}
        </label>
        <label className={b.select}>
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            {Object.entries(SORTS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <span className={b.result} aria-live="polite">
          {matches.length} {matches.length === 1 ? "article" : "articles"}
        </span>
      </div>

      <div className={styles.chips} role="toolbar" aria-label="Filter articles by category">
        {[{ id: "all", label: allLabel, n: items.length }, ...categories.map((c) => ({ id: c.id, label: c.label, n: count(c.id) }))].map((c) => (
          <button
            key={c.id}
            type="button"
            className={styles.filter}
            aria-pressed={active === c.id}
            onClick={() => (setActive(c.id), setVisible(pageSize))}
            disabled={c.n === 0 && c.id !== "all"}
          >
            {c.label}
            <span className={styles.filterCount}>{c.n}</span>
          </button>
        ))}
      </div>

      {matches.length === 0 ? (
        <div className={b.noResults}>
          <p>No articles match{q ? ` “${query.trim()}”` : ""}{active !== "all" ? ` in ${categories.find((c) => c.id === active)?.label}` : ""}.</p>
          <button type="button" onClick={reset}>
            Show all articles
          </button>
        </div>
      ) : grouped ? (
        <>
          {lead && lead.card}
          <div className={b.sections}>
            {categories
              .map((c) => ({ c, list: matches.filter((i) => i.category === c.id && i.slug !== lead?.slug) }))
              .filter(({ list }) => list.length > 0)
              .map(({ c, list }) => (
                <section key={c.id} className={b.section} aria-labelledby={`cat-${c.id}`}>
                  <div className={b.sectionHead}>
                    <div>
                      <h2 id={`cat-${c.id}`} className={b.sectionTitle}>
                        {c.label}
                        <span className={b.sectionCount}>{count(c.id)}</span>
                      </h2>
                      <p className={b.sectionDesc}>{c.description}</p>
                    </div>
                    {count(c.id) > PER_SECTION && (
                      <button type="button" className={b.seeAll} onClick={() => (setActive(c.id), window.scrollTo({ top: 0, behavior: "smooth" }))}>
                        See all {count(c.id)} <span aria-hidden="true">→</span>
                      </button>
                    )}
                  </div>
                  {grid(list.slice(0, PER_SECTION))}
                </section>
              ))}
          </div>
        </>
      ) : (
        <>
          {grid(matches.slice(0, visible))}
          {matches.length > visible && (
            <button type="button" className={styles.more} onClick={() => setVisible((v) => v + pageSize)}>
              Show more articles <span aria-hidden="true">↓</span>
            </button>
          )}
        </>
      )}
    </div>
  );
}
