"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatDate } from "@/lib/format";
import type { WallPhoto, AlbumMeta } from "./types";
import styles from "./Gallery.module.css";

interface LightboxProps {
  photos: WallPhoto[];
  index: number;
  albums: Record<string, AlbumMeta>;
  onIndex: (i: number) => void;
  onClose: () => void;
  /** Hide the album link when already on that album's page. */
  linkAlbums: boolean;
}

const MAX_ZOOM = 4;

/**
 * Full-screen viewer in a native <dialog> (focus stays inside, background is
 * inert, Esc closes). Swipe/arrow keys to move, swipe down to close,
 * double-tap or pinch to zoom, drag to pan while zoomed. No download button.
 */
export function Lightbox({ photos, index, albums, onIndex, onClose, linkAlbums }: LightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState({ s: 1, x: 0, y: 0 });
  const [copied, setCopied] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ startX: number; startY: number; startZoom: typeof zoom; pinchDist?: number; moved: boolean } | null>(null);
  const lastTap = useRef(0);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  const photo = photos[index];
  const album = albums[photo.albumSlug];
  const go = useCallback((d: number) => onIndex((index + d + photos.length) % photos.length), [index, photos.length, onIndex]);

  useEffect(() => {
    const d = dialogRef.current;
    if (d && !d.open) d.showModal();
    document.body.setAttribute("data-scroll-locked", "");
    return () => document.body.removeAttribute("data-scroll-locked");
  }, []);

  // Reset zoom and preload neighbours whenever the photo changes.
  useEffect(() => {
    setZoom({ s: 1, x: 0, y: 0 });
    setDrag({ x: 0, y: 0 });
    for (const d of [1, -1]) {
      const p = photos[(index + d + photos.length) % photos.length];
      const img = new Image();
      img.sizes = "100vw";
      img.srcset = p.srcSet;
    }
  }, [index, photos]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const clampPan = (s: number, x: number, y: number) => {
    const r = stageRef.current?.getBoundingClientRect();
    if (!r || s <= 1) return { s: Math.max(1, s), x: 0, y: 0 };
    const mx = ((s - 1) * r.width) / 2;
    const my = ((s - 1) * r.height) / 2;
    return { s, x: Math.max(-mx, Math.min(mx, x)), y: Math.max(-my, Math.min(my, y)) };
  };

  const zoomAt = (clientX: number, clientY: number) => {
    const r = stageRef.current!.getBoundingClientRect();
    if (zoom.s > 1) return setZoom({ s: 1, x: 0, y: 0 });
    const s = 2.5;
    const cx = clientX - (r.left + r.width / 2);
    const cy = clientY - (r.top + r.height / 2);
    setZoom(clampPan(s, -cx * (s - 1), -cy * (s - 1)));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setActive(true);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    gesture.current = {
      startX: e.clientX,
      startY: e.clientY,
      startZoom: zoom,
      pinchDist: pts.length === 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : undefined,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    const pts = [...pointers.current.values()];
    if (pts.length === 2 && g.pinchDist) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      setZoom(clampPan(Math.min(MAX_ZOOM, g.startZoom.s * (dist / g.pinchDist)), g.startZoom.x, g.startZoom.y));
      g.moved = true;
      return;
    }
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (Math.abs(dx) + Math.abs(dy) > 6) g.moved = true;
    if (zoom.s > 1) setZoom(clampPan(g.startZoom.s, g.startZoom.x + dx, g.startZoom.y + dy));
    else setDrag({ x: dx, y: Math.max(0, dy) });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (!g || pointers.current.size > 0) return;
    gesture.current = null;
    setActive(false);
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    setDrag({ x: 0, y: 0 });
    if (zoom.s === 1 && g.moved) {
      if (dy > 90 && Math.abs(dy) > Math.abs(dx)) return onClose();
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) return go(dx < 0 ? 1 : -1);
    }
    if (!g.moved) {
      const now = Date.now();
      if (now - lastTap.current < 300) {
        zoomAt(e.clientX, e.clientY);
        lastTap.current = 0;
      } else lastTap.current = now;
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", window.location.href);
    }
  };

  const dragFade = Math.max(0.35, 1 - drag.y / 400);

  return (
    <dialog
      ref={dialogRef}
      className={styles.lightbox}
      aria-label={`Photo ${index + 1} of ${photos.length}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      style={{ "--fade": dragFade } as React.CSSProperties}
    >
      <div className={styles.lbBar}>
        <span className={styles.lbCount}>
          {index + 1} / {photos.length}
        </span>
        <div className={styles.lbTools}>
          <button type="button" className={styles.lbBtn} onClick={copy}>
            {copied ? "Link copied" : "Copy link"}
          </button>
          <button type="button" className={styles.lbClose} onClick={onClose} aria-label="Close" autoFocus>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={stageRef}
        className={styles.lbStage}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        data-zoomed={zoom.s > 1 || undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={photo.albumSlug + photo.id}
          className={styles.lbImg}
          src={photo.src}
          srcSet={photo.srcSet}
          sizes="100vw"
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          draggable={false}
          style={{
            backgroundImage: `url(${photo.blur})`,
            transform: `translate(${zoom.x + drag.x}px, ${zoom.y + drag.y}px) scale(${zoom.s})`,
            transition: active ? "none" : undefined,
            viewTransitionName: "gallery-photo",
          }}
        />
      </div>

      {photos.length > 1 && (
        <>
          <button type="button" className={`${styles.lbNav} ${styles.lbPrev}`} onClick={() => go(-1)} aria-label="Previous photo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="m15 5-7 7 7 7" />
            </svg>
          </button>
          <button type="button" className={`${styles.lbNav} ${styles.lbNext}`} onClick={() => go(1)} aria-label="Next photo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="m9 5 7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      <div className={styles.lbInfo}>
        {photo.caption && <p className={styles.lbCaption}>{photo.caption}</p>}
        <p className={styles.lbMeta}>
          {linkAlbums ? (
            <Link href={`/gallery/${photo.albumSlug}`} className={styles.lbAlbum} onClick={onClose}>
              {album.title}
            </Link>
          ) : (
            <span className={styles.lbAlbum}>{album.title}</span>
          )}
          <span>{[formatDate(album.date), album.city].filter(Boolean).join(" · ")}</span>
        </p>
      </div>
    </dialog>
  );
}
