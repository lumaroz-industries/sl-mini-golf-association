"use client";

import { useState } from "react";
import styles from "./Embed.module.css";

interface EmbedProps {
  provider: "youtube" | "instagram";
  id: string;
  kind?: string;
  url: string;
}

const LABEL = { youtube: "YouTube video", instagram: "Instagram post" } as const;

/**
 * Click-to-load embed. Nothing is requested from YouTube or Instagram until
 * the reader chooses to play/view — faster pages and better privacy.
 */
export function Embed({ provider, id, kind, url }: EmbedProps) {
  const [active, setActive] = useState(false);
  const src =
    provider === "youtube"
      ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`
      : `https://www.instagram.com/${kind === "reel" ? "reel" : "p"}/${encodeURIComponent(id)}/embed`;

  return (
    <figure className={styles.embed} data-provider={provider}>
      <div className={styles.frame}>
        {active ? (
          <iframe
            src={src}
            title={LABEL[provider]}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button type="button" className={styles.poster} onClick={() => setActive(true)}>
            <span className={styles.play} aria-hidden="true">
              {provider === "youtube" ? (
                <svg viewBox="0 0 24 24" width="28" height="28"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.3" cy="6.7" r="0.9" fill="currentColor" stroke="none" /></svg>
              )}
            </span>
            <span className={styles.label}>{provider === "youtube" ? "Play video" : "View post"}</span>
            <span className={styles.note}>Loads content from {provider === "youtube" ? "YouTube" : "Instagram"}</span>
          </button>
        )}
      </div>
      <figcaption className={styles.caption}>
        <a href={url} target="_blank" rel="noopener noreferrer">
          Open on {provider === "youtube" ? "YouTube" : "Instagram"} <span aria-hidden="true">↗</span>
        </a>
      </figcaption>
    </figure>
  );
}
