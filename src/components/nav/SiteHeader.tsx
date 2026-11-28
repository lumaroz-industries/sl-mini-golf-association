"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SocialLink } from "@/content/schema";
import { AppDownload } from "@/components/ui/AppDownload";
import { MenuOverlay } from "./MenuOverlay";
import { isActive, navigation } from "@/config/navigation";
import styles from "./SiteHeader.module.css";

interface SiteHeaderProps {
  siteName: string;
  tagline: [string, string];
  email?: string;
  social: Array<SocialLink & { url: string }>;
}

const SCROLL_THRESHOLD = 24;
/** Elements outside the header that become inert while the menu is open. */
const INERT_TARGETS = ["main-content", "site-footer"];

export function SiteHeader({ siteName, tagline, email, social }: SiteHeaderProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // Darken / increase blur once the page has scrolled.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the menu whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // While open: lock scroll, make the rest of the page inert, handle Escape.
  useEffect(() => {
    if (!open) return;
    const body = document.body;
    body.setAttribute("data-scroll-locked", "");
    const targets = INERT_TARGETS.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    targets.forEach((el) => el.setAttribute("inert", ""));

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      body.removeAttribute("data-scroll-locked");
      targets.forEach((el) => el.removeAttribute("inert"));
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <header className={styles.header} data-scrolled={scrolled || undefined} data-menu-open={open || undefined}>
        <div className={styles.bar}>
          <Link href="/" className={styles.brand} aria-label={`${siteName} — home`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/slmga-icon-dark.svg" alt="" width={84} height={28} className={styles.mark} />
            <span className={styles.brandText} aria-hidden="true">
              Mini Golf
              <br />
              Association
            </span>
          </Link>

          {/* Quick links on wide screens; the full menu stays one tap away. */}
          <nav className={styles.links} aria-label="Quick links">
            {navigation
              .filter((n) => n.href !== "/")
              .map((n) => (
                <Link key={n.href} href={n.href} className={styles.quick} aria-current={isActive(pathname, n.href) ? "page" : undefined}>
                  {n.label}
                </Link>
              ))}
          </nav>

          <AppDownload variant="pill" className={styles.app} />

          <button
            ref={toggleRef}
            type="button"
            className={styles.toggle}
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span className={styles.toggleLabel}>{open ? "Close" : "Menu"}</span>
            <span className={styles.toggleIcon} aria-hidden="true">
              <span />
              <span />
            </span>
          </button>
        </div>
      </header>

      <MenuOverlay id="site-menu" open={open} onNavigate={close} pathname={pathname} tagline={tagline} email={email} social={social} />
    </>
  );
}
