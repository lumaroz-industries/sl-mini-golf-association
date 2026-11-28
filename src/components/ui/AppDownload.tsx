import { APP_DOWNLOAD_PATH } from "@/config/app";
import styles from "./AppDownload.module.css";

function AndroidIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
      <path
        fill="currentColor"
        d="M17.6 9.48 19.44 6.3a.38.38 0 0 0-.66-.38l-1.86 3.22A11.5 11.5 0 0 0 12 8.1c-1.77 0-3.43.38-4.92 1.04L5.22 5.92a.38.38 0 0 0-.66.38L6.4 9.48A10.8 10.8 0 0 0 1 18h22a10.8 10.8 0 0 0-5.4-8.52ZM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z"
      />
    </svg>
  );
}

/**
 * Download button for the Android app. Hidden inside the installed app itself
 * (it runs in standalone display mode), where it would make no sense.
 * - "pill": small, for the header bar.
 * - "card": icon, title and "Android · APK" line, for the footer and the menu.
 */
export function AppDownload({ variant = "card", className = "" }: { variant?: "pill" | "card"; className?: string }) {
  if (variant === "pill")
    return (
      <a href={APP_DOWNLOAD_PATH} className={`${styles.pill} ${className}`} data-app-download>
        <AndroidIcon />
        <span className={styles.pillText}>Get the app</span>
        <span className="visually-hidden"> — download the Android app (APK)</span>
      </a>
    );
  return (
    <a href={APP_DOWNLOAD_PATH} className={`${styles.card} ${className}`} data-app-download>
      <span className={styles.badge}>
        <AndroidIcon />
      </span>
      <span className={styles.text}>
        <span className={styles.title}>Download the app</span>
        <span className={styles.sub}>Android · APK</span>
      </span>
      <span className={styles.arrow} aria-hidden="true">
        ↓
      </span>
    </a>
  );
}
