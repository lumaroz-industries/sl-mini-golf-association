import Link from "next/link";
import type { NavItem } from "@/config/navigation";
import styles from "./ComingSoon.module.css";

/** Shared branded placeholder for routes that are not built yet. */
export function ComingSoon({ item }: { item: NavItem }) {
  return (
    <section className={styles.wrap} aria-labelledby="coming-soon-title">
      <div className={styles.glow} aria-hidden="true" />
      <div className={`container ${styles.inner}`}>
        <span className="kicker">Coming soon</span>
        <h1 id="coming-soon-title" className={styles.title}>
          {item.label}
        </h1>
        <p className={styles.summary}>{item.summary}</p>
        <p className={styles.note}>This page is being built. Check back soon.</p>
        <Link href="/" className={styles.back}>
          <span aria-hidden="true">←</span> Back to home
        </Link>
      </div>
    </section>
  );
}
