"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { formatDate } from "@/lib/format";
import { Lightbox } from "./Lightbox";
import type { AlbumMeta, WallPhoto } from "./types";
import styles from "./Gallery.module.css";

interface PhotoWallProps {
  photos: WallPhoto[];
  albums: AlbumMeta[];
  /** Show album filter chips (main gallery page). */
  filterable: boolean;
  allLabel?: string;
}

const keyOf = (p: WallPhoto) => `${p.albumSlug}/${p.id}`;

/** Target row height and gap per container width (matches the CSS fallback). */
function rowTarget(width: number): { target: number; gap: number } {
  if (width < 640) return { target: 150, gap: 5 };
  if (width < 1080) return { target: 220, gap: 8 };
  return { target: 280, gap: 8 };
}

/**
 * Justified rows: add photos to a row until its height would drop below the
 * target, then break wherever the row height lands closest to the target.
 * The last row keeps the target height instead of stretching.
 */
function justify(ratios: number[], width: number): Array<{ w: number; h: number }> {
  const { target, gap } = rowTarget(width);
  const out: Array<{ w: number; h: number }> = [];
  let row: number[] = [];
  const heightOf = (r: number[]) => (width - gap * (r.length - 1)) / r.reduce((a, b) => a + b, 0);
  const flush = (r: number[], h: number) => r.forEach((a) => out.push({ w: a * h, h }));
  for (const a of ratios) {
    const without = row.length ? heightOf(row) : Infinity;
    const withIt = heightOf([...row, a]);
    if (row.length && withIt < target && Math.abs(without - target) <= Math.abs(withIt - target)) {
      flush(row, without);
      row = [a];
    } else {
      row.push(a);
    }
  }
  if (row.length) {
    const h = heightOf(row);
    flush(row, Math.min(h, target * 1.15));
  }
  return out;
}

type DocWithVT = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };

/**
 * Justified photo wall: rows always fill the width and every photo keeps its
 * shape (pure CSS flex — no layout script). Album filter and the open photo
 * live in the URL (?album=…&photo=…) so both can be shared.
 */
export function PhotoWall({ photos, albums, filterable, allLabel = "All" }: PhotoWallProps) {
  const [album, setAlbum] = useState<string>("all");
  const [open, setOpen] = useState<number | null>(null);
  const [vtName, setVtName] = useState<string | null>(null);
  const wallRef = useRef<HTMLUListElement>(null);
  const [wallWidth, setWallWidth] = useState(0);
  const lastOpenKey = useRef<string | null>(null);
  const albumMap = useMemo(() => Object.fromEntries(albums.map((a) => [a.slug, a])), [albums]);
  const shown = useMemo(() => (album === "all" ? photos : photos.filter((p) => p.albumSlug === album)), [album, photos]);

  // Measure the wall so rows can be justified precisely (CSS flex is the no-JS fallback).
  useLayoutEffect(() => {
    const el = wallRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWallWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Restore state from the URL (and on back/forward).
  useEffect(() => {
    const read = () => {
      const q = new URLSearchParams(window.location.search);
      const a = q.get("album");
      const nextAlbum = filterable && a && albumMap[a] ? a : "all";
      setAlbum(nextAlbum);
      const key = q.get("photo");
      const list = nextAlbum === "all" ? photos : photos.filter((p) => p.albumSlug === nextAlbum);
      const i = key ? list.findIndex((p) => keyOf(p) === key) : -1;
      setOpen(i >= 0 ? i : null);
      // Closed via the browser's back button: return focus to the photo.
      if (i < 0 && lastOpenKey.current) {
        const k = lastOpenKey.current;
        lastOpenKey.current = null;
        window.setTimeout(() => document.getElementById(`tile-${k}`)?.focus({ preventScroll: true }), 50);
      }
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, [albumMap, filterable, photos]);

  const writeUrl = (next: { album?: string; photo?: string | null }, push: boolean) => {
    const url = new URL(window.location.href);
    if (next.album !== undefined) {
      if (next.album === "all") url.searchParams.delete("album");
      else url.searchParams.set("album", next.album);
    }
    if (next.photo !== undefined) {
      if (next.photo) url.searchParams.set("photo", next.photo);
      else url.searchParams.delete("photo");
    }
    window.history[push ? "pushState" : "replaceState"]({ gallery: true }, "", url);
  };

  const animate = (update: () => void) => {
    const doc = document as DocWithVT;
    if (!doc.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return update();
    doc.startViewTransition(() => flushSync(update));
  };

  const openAt = (i: number) => {
    setVtName(keyOf(shown[i]));
    animate(() => {
      setVtName(null);
      setOpen(i);
    });
    writeUrl({ photo: keyOf(shown[i]) }, true);
  };

  const close = useCallback(() => {
    if (open === null) return;
    const key = keyOf(shown[open]);
    animate(() => {
      setOpen(null);
      setVtName(key);
    });
    lastOpenKey.current = null;
    if (window.history.state?.gallery) window.history.back();
    else writeUrl({ photo: null }, false);
    window.setTimeout(() => {
      setVtName(null);
      document.getElementById(`tile-${key}`)?.focus({ preventScroll: true });
    }, 450);
  }, [open, shown]);

  const changeIndex = (i: number) => {
    setOpen(i);
    writeUrl({ photo: keyOf(shown[i]) }, false);
  };

  const selectAlbum = (slug: string) => {
    setAlbum(slug);
    writeUrl({ album: slug, photo: null }, false);
  };

  const current = album !== "all" ? albumMap[album] : undefined;
  const sizes = useMemo(() => (wallWidth ? justify(shown.map((p) => p.width / p.height), wallWidth) : null), [shown, wallWidth]);

  useEffect(() => {
    lastOpenKey.current = open !== null && shown[open] ? keyOf(shown[open]) : lastOpenKey.current;
  }, [open, shown]);

  return (
    <div className={styles.wallWrap}>
      {filterable && albums.length > 1 && (
        <div className={styles.chips} role="toolbar" aria-label="Filter photos by album">
          {[{ slug: "all", title: allLabel, count: photos.length } as AlbumMeta, ...albums].map((a) => (
            <button
              key={a.slug}
              type="button"
              className={styles.filter}
              aria-pressed={album === a.slug}
              onClick={() => selectAlbum(a.slug)}
              title={a.slug === "all" ? undefined : [formatDate(a.date), a.city].filter(Boolean).join(" · ")}
            >
              {a.title}
              <span className={styles.filterCount}>{a.count}</span>
            </button>
          ))}
        </div>
      )}

      {filterable && current && (
        <div className={styles.albumBar}>
          <div>
            <p className={styles.albumBarTitle}>{current.title}</p>
            <p className={styles.albumBarMeta}>{[formatDate(current.date), current.city, `${current.count} photos`].filter(Boolean).join(" · ")}</p>
          </div>
          <Link href={`/gallery/${current.slug}`} className={styles.albumBarLink}>
            Open album <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}

      <p className="visually-hidden" aria-live="polite">
        {shown.length} photos shown
      </p>

      <ul ref={wallRef} className={styles.wall} data-justified={sizes ? "" : undefined}>
        {shown.map((p, i) => {
          const key = keyOf(p);
          return (
            <li
              key={key}
              className={styles.tile}
              style={{ "--a": (p.width / p.height).toFixed(4), ...(sizes ? { width: sizes[i].w, height: sizes[i].h } : {}) } as React.CSSProperties}
            >
              <button
                id={`tile-${key}`}
                type="button"
                className={styles.tileBtn}
                onClick={() => openAt(i)}
                aria-label={`Open photo: ${p.alt}`}
                style={{ backgroundImage: `url(${p.blur})` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.srcSet.split(", ")[Math.min(1, p.srcSet.split(", ").length - 1)].split(" ")[0]}
                  srcSet={p.srcSet}
                  sizes="(max-width: 640px) 60vw, (max-width: 1200px) 35vw, 480px"
                  alt=""
                  width={p.width}
                  height={p.height}
                  loading={i < 6 ? "eager" : "lazy"}
                  decoding="async"
                  draggable={false}
                  className={styles.tileImg}
                  style={{ viewTransitionName: vtName === key ? "gallery-photo" : undefined }}
                />
                {p.caption && <span className={styles.tileCaption}>{p.caption}</span>}
              </button>
            </li>
          );
        })}
      </ul>

      {open !== null && shown[open] && (
        <Lightbox photos={shown} index={open} albums={albumMap} onIndex={changeIndex} onClose={close} linkAlbums={filterable} />
      )}
    </div>
  );
}
