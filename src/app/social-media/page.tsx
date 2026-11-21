import type { Metadata } from "next";
import Link from "next/link";
import { findNavItem } from "@/config/navigation";
import { PLATFORMS, deriveHandle } from "@/config/social-platforms";
import { getActiveSocialLinks, getSiteSettings, getSocialPageContent } from "@/content/repository";
import { SocialIcon } from "@/components/ui/SocialIcon";
import styles from "./page.module.css";

const item = findNavItem("/social-media");

export const metadata: Metadata = {
  title: item.label,
  description: item.summary,
  alternates: { canonical: "/social-media" },
};

export default async function SocialMediaPage() {
  const [content, links, site] = await Promise.all([getSocialPageContent(), getActiveSocialLinks(), getSiteSettings()]);

  return (
    <section className={styles.page} aria-labelledby="social-title">
      <div className={styles.glow} aria-hidden="true" />
      <div className={`container ${styles.inner}`}>
        <header className={styles.header}>
          <span className="kicker">{content.kicker}</span>
          <h1 id="social-title" className={styles.title}>
            {content.heading}
          </h1>
          <p className={styles.intro}>{content.intro}</p>
        </header>

        {links.length > 0 ? (
          <ul className={styles.grid} data-count={links.length}>
            {links.map((link, i) => {
              const info = PLATFORMS[link.platform];
              const handle = link.handle ?? deriveHandle(link.platform, link.url);
              return (
                <li key={link.platform} className={styles.item} style={{ "--i": i } as React.CSSProperties}>
                  <a className={styles.card} href={link.url} target="_blank" rel="noopener noreferrer" data-platform={link.platform}>
                    <span className={styles.top}>
                      <span className={styles.icon}>
                        <SocialIcon platform={link.platform} size={30} />
                      </span>
                      <span className={styles.index} aria-hidden="true">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </span>
                    <span className={styles.body}>
                      <span className={styles.platform}>{info.label}</span>
                      {handle && <span className={styles.handle}>{handle}</span>}
                      {link.description && <span className={styles.description}>{link.description}</span>}
                    </span>
                    <span className={styles.cta}>
                      {info.action} on {info.label}
                      <span className={styles.arrow} aria-hidden="true">
                        ↗
                      </span>
                      <span className="visually-hidden"> (opens in a new tab)</span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className={styles.empty}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/slmga-icon-dark.svg" alt="" width={96} height={32} className={styles.emptyMark} />
            <p className={styles.emptyText}>{content.emptyState}</p>
            <Link href="/contact" className={styles.emptyLink}>
              Contact {site.name} <span aria-hidden="true">→</span>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
