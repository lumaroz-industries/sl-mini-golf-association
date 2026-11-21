"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { isActive, navigation } from "@/config/navigation";
import type { SocialLink } from "@/content/schema";
import { SocialLinks } from "@/components/ui/SocialLinks";
import styles from "./MenuOverlay.module.css";

interface MenuOverlayProps {
  id: string;
  open: boolean;
  pathname: string;
  onNavigate: () => void;
  tagline: [string, string];
  email?: string;
  social: Array<SocialLink & { url: string }>;
}

export function MenuOverlay({ id, open, pathname, onNavigate, tagline, email, social }: MenuOverlayProps) {
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (open) {
      // Wait for the overlay to become visible before moving focus.
      const t = window.setTimeout(() => firstLinkRef.current?.focus({ preventScroll: true }), 80);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  return (
    <div id={id} className={styles.overlay} data-open={open || undefined} inert={!open}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.grid} aria-hidden="true" />

      <div className={styles.inner}>
        <nav aria-label="Main" className={styles.nav}>
          <ol className={styles.list}>
            {navigation.map((item, i) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href} className={styles.item} style={{ "--i": i } as React.CSSProperties}>
                  <Link
                    ref={i === 0 ? firstLinkRef : undefined}
                    href={item.href}
                    className={styles.link}
                    aria-current={active ? "page" : undefined}
                    onClick={onNavigate}
                  >
                    <span className={styles.meta}>
                      <span className={styles.index} aria-hidden="true">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {item.status === "coming-soon" && <span className={styles.soon}>Soon</span>}
                    </span>
                    <span className={styles.label}>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </nav>

        <aside className={styles.aside} style={{ "--i": navigation.length } as React.CSSProperties}>
          <p className={styles.tagline}>
            {tagline[0]}
            <br />
            <span>{tagline[1]}</span>
          </p>
          <p className={styles.note}>An independent mini-golf community platform.</p>
          {email && (
            <a className={styles.email} href={`mailto:${email}`}>
              {email}
            </a>
          )}
          {social.length > 0 && <SocialLinks links={social} className={styles.social} />}
        </aside>
      </div>
    </div>
  );
}
