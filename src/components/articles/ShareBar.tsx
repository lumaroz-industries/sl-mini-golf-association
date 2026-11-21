"use client";

import { useState } from "react";
import { SocialIcon } from "@/components/ui/SocialIcon";
import styles from "./Articles.module.css";

/** Plain share links — no third-party scripts or tracking. */
export function ShareBar({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const targets = [
    { id: "whatsapp", label: "WhatsApp", href: `https://wa.me/?text=${t}%20${u}`, icon: <SocialIcon platform="whatsapp" size={18} /> },
    {
      id: "x",
      label: "X",
      href: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z" />
        </svg>
      ),
    },
    { id: "facebook", label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, icon: <SocialIcon platform="facebook" size={18} /> },
    { id: "linkedin", label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, icon: <SocialIcon platform="linkedin" size={18} /> },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Copy this link:", url);
    }
  };

  return (
    <div className={styles.share}>
      <span className={styles.shareLabel}>Share</span>
      <ul>
        {targets.map((s) => (
          <li key={s.id}>
            <a href={s.href} target="_blank" rel="noopener noreferrer" className={styles.shareBtn}>
              {s.icon}
              <span className="visually-hidden">Share on {s.label} (opens in a new tab)</span>
            </a>
          </li>
        ))}
        <li>
          <button type="button" className={styles.shareBtn} onClick={copy} data-copied={copied || undefined}>
            {copied ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2" /></svg>
            )}
            <span className="visually-hidden">{copied ? "Link copied" : "Copy link"}</span>
          </button>
        </li>
      </ul>
      <span className={styles.copied} role="status">
        {copied ? "Link copied" : ""}
      </span>
    </div>
  );
}
