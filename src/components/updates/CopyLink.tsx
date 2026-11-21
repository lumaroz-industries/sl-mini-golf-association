"use client";

import { useState } from "react";
import styles from "./Updates.module.css";

export function CopyLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const url = new URL(path, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  };
  return (
    <button type="button" className={styles.copy} onClick={copy} data-copied={copied || undefined}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2" />
      </svg>
      <span role="status">{copied ? "Link copied" : "Copy link"}</span>
    </button>
  );
}
