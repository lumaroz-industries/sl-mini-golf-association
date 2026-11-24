"use client";

import Link from "next/link";
import { useMemo } from "react";
import { formatDate } from "@/lib/format";
import { useUrlState } from "@/components/ui/useUrlState";
import { PhotoWall } from "./PhotoWall";
import type { AlbumMeta, WallPhoto } from "./types";
import styles from "./Gallery.module.css";
import a from "@/components/articles/Articles.module.css";
import b from "@/components/ui/Browse.module.css";

interface GalleryBrowserProps {
  albums: AlbumMeta[];
  photos: WallPhoto[];
  categories: Array<{ id: string; label: string; description: string }>;
  allLabel: string;
}

const SORTS = { newest: "Newest first", oldest: "Oldest first", az: "Title A–Z", most: "Most photos" } as const;
type Sort = keyof typeof SORTS;
type View = "albums" | "photos";
const OTHER = "other";

/**
 * Category-wise gallery: Albums (grouped by category) or All photos (one
 * justified wall), with category tabs, sorting and a city filter. Everything
 * is kept in the URL so a filtered view can be shared.
 */
export function GalleryBrowser({ albums, photos, categories, allLabel }: GalleryBrowserProps) {
  const hasOther = albums.some((x) => !x.category || !categories.some((c) => c.id === x.category));
  const cats = [...categories, ...(hasOther ? [{ id: OTHER, label: "More albums", description: "Other albums from the community." }] : [])];
  const catOf = (x: AlbumMeta) => (x.category && categories.some((c) => c.id === x.category) ? x.category : OTHER);
  const cities = [...new Set(albums.map((x) => x.city).filter((c): c is string => Boolean(c)))].sort();

  const [view, setView] = useUrlState<View>("view", "albums", (v) => v === "albums" || v === "photos");
  const [active, setActive] = useUrlState<string>("category", "all", (v) => cats.some((c) => c.id === v));
  const [sort, setSort] = useUrlState<Sort>("sort", "newest", (v) => v in SORTS);
  const [city, setCity] = useUrlState<string>("city", "all", (v) => cities.includes(v));

  const shown = useMemo(() => {
    const by: Record<Sort, (x: AlbumMeta, y: AlbumMeta) => number> = {
      newest: (x, y) => y.date.localeCompare(x.date) || x.title.localeCompare(y.title),
      oldest: (x, y) => x.date.localeCompare(y.date) || x.title.localeCompare(y.title),
      az: (x, y) => x.title.localeCompare(y.title),
      most: (x, y) => y.count - x.count || y.date.localeCompare(x.date),
    };
    return albums.filter((x) => (active === "all" || catOf(x) === active) && (city === "all" || x.city === city)).sort(by[sort]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albums, active, sort, city]);

  const wallPhotos = useMemo(() => {
    const order = new Map(shown.map((x, i) => [x.slug, i]));
    return photos.filter((p) => order.has(p.albumSlug)).sort((p, q) => order.get(p.albumSlug)! - order.get(q.albumSlug)!);
  }, [photos, shown]);

  const photoCount = (list: AlbumMeta[]) => list.reduce((n, x) => n + x.count, 0);
  /** Albums in a category (respecting the city filter) — the tabs count albums, like the sections. */
  const countIn = (id: string) => albums.filter((x) => (id === "all" || catOf(x) === id) && (city === "all" || x.city === city)).length;

  const card = (x: AlbumMeta, i: number) => (
    <li key={x.slug} className={styles.albumCell} style={{ "--i": i } as React.CSSProperties}>
      <Link href={`/gallery/${x.slug}`} className={styles.albumCard}>
        <span className={styles.albumCover} style={x.cover ? { backgroundImage: `url(${x.cover.blur})` } : undefined}>
          {x.cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={x.cover.src} srcSet={x.cover.srcSet} sizes="(max-width: 640px) 100vw, (max-width: 1080px) 50vw, 33vw" alt={x.cover.alt} loading="lazy" decoding="async" />
          )}
          <span className={styles.albumCount}>{x.count} photos</span>
        </span>
        <span className={styles.albumInfo}>
          <span className={styles.albumTitle}>{x.title}</span>
          <span className={styles.albumMeta}>{[formatDate(x.date), x.city].filter(Boolean).join(" · ")}</span>
        </span>
      </Link>
    </li>
  );

  const reset = () => {
    setActive("all");
    setCity("all");
    setSort("newest");
  };

  return (
    <div className={styles.browser}>
      <div className={b.toolbar}>
        <div className={b.segment} role="group" aria-label="View">
          <button type="button" aria-pressed={view === "albums"} onClick={() => setView("albums")}>
            Albums
          </button>
          <button type="button" aria-pressed={view === "photos"} onClick={() => setView("photos")}>
            All photos
          </button>
        </div>
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
        {cities.length > 1 && (
          <label className={b.select}>
            City
            <select value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="all">All cities</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        )}
        <span className={b.result} aria-live="polite">
          {shown.length} {shown.length === 1 ? "album" : "albums"} · {photoCount(shown)} photos
        </span>
      </div>

      <div className={a.chips} role="toolbar" aria-label="Filter by category">
        {[{ id: "all", label: "All" }, ...cats].map((c) => {
          const n = countIn(c.id);
          return (
            <button key={c.id} type="button" className={a.filter} aria-pressed={active === c.id} onClick={() => setActive(c.id)} disabled={n === 0 && c.id !== "all"}>
              {c.label}
              <span className={a.filterCount}>{n}</span>
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <div className={b.noResults}>
          <p>No albums here yet.</p>
          <button type="button" onClick={reset}>
            Show all albums
          </button>
        </div>
      ) : view === "photos" ? (
        <PhotoWall key={`${active}|${sort}|${city}`} photos={wallPhotos} albums={shown} filterable allLabel={allLabel} />
      ) : active === "all" ? (
        <div className={b.sections}>
          {cats
            .map((c) => ({ c, list: shown.filter((x) => catOf(x) === c.id) }))
            .filter(({ list }) => list.length > 0)
            .map(({ c, list }) => (
              <section key={c.id} className={b.section} aria-labelledby={`gal-${c.id}`}>
                <div className={b.sectionHead}>
                  <div>
                    <h2 id={`gal-${c.id}`} className={b.sectionTitle}>
                      {c.label}
                      <span className={b.sectionCount}>
                        {list.length} {list.length === 1 ? "album" : "albums"}
                      </span>
                    </h2>
                    <p className={b.sectionDesc}>{c.description}</p>
                  </div>
                  <button type="button" className={b.seeAll} onClick={() => setActive(c.id)}>
                    Only {c.label} <span aria-hidden="true">→</span>
                  </button>
                </div>
                <ul className={styles.albumGrid}>{list.map(card)}</ul>
              </section>
            ))}
        </div>
      ) : (
        <ul className={styles.albumGrid}>{shown.map(card)}</ul>
      )}
    </div>
  );
}
