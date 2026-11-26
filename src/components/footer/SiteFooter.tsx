import Link from "next/link";
import { navigation } from "@/config/navigation";
import { getActiveSocialLinks, getPeopleByIds, getPeopleInstagram, getSiteSettings } from "@/content/repository";
import { InstagramHandle } from "@/components/ui/InstagramHandle";
import { Logo } from "@/components/ui/Logo";
import { SocialLinks } from "@/components/ui/SocialLinks";
import styles from "./SiteFooter.module.css";

export async function SiteFooter() {
  const site = await getSiteSettings();
  const social = await getActiveSocialLinks();
  const [owner, developer] = await getPeopleByIds([site.credits.ownerId, site.credits.developerId]);
  const instagram = await getPeopleInstagram();
  const year = new Date().getFullYear();
  const email = site.contact.email;
  // Gmail compose: a plain mailto: link does nothing on computers without a mail app.
  const gmail = email ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}` : "";

  return (
    <footer id="site-footer" className={styles.footer}>
      <div className={styles.rule} aria-hidden="true" />
      {/* Huge outlined SL, as a watermark behind the footer. */}
      <span className={styles.watermark} aria-hidden="true">
        SL
      </span>

      {/* Closing call to action. */}
      <div className="container">
        <div className={styles.cta}>
          <div>
            <span className={styles.ctaKicker}>SL Mini Golf Association</span>
            <p className={styles.ctaTitle}>
              {site.tagline[0]} <span>{site.tagline[1]}</span>
            </p>
          </div>
          <div className={styles.ctaActions}>
            <Link href="/contact" className={styles.ctaPrimary}>
              Get in touch <span aria-hidden="true">→</span>
            </Link>
            <Link href="/social-media" className={styles.ctaSecondary}>
              Follow the community
            </Link>
          </div>
        </div>
      </div>

      <div className={`container ${styles.top}`}>
        <div className={styles.brand}>
          <Link href="/" aria-label={`${site.name} — home`} className={styles.logoLink}>
            <Logo width={260} />
          </Link>
          <p className={styles.description}>{site.description}</p>
        </div>

        <nav className={styles.col} aria-label="Footer">
          <h2 className={styles.heading}>Navigate</h2>
          <ul className={styles.links}>
            {navigation.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={styles.link}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.col}>
          <h2 className={styles.heading}>Connect</h2>
          {email && (
            <a className={styles.email} href={gmail} target="_blank" rel="noopener noreferrer">
              {email} <span aria-hidden="true">↗</span>
              <span className="visually-hidden"> — write in Gmail (opens in a new tab)</span>
            </a>
          )}
          <SocialLinks links={social} />
          {!email && social.length === 0 && (
            <p className={styles.pending}>Official contact and social channels will be listed here soon.</p>
          )}
        </div>
      </div>

      <div className={`container ${styles.credits}`}>
        {[owner, developer].map((person) => (
          <div key={person.id} className={styles.credit} data-finish={person.id === developer.id ? "diamond" : "gold"}>
            <span className={styles.creditRole}>{person.role}</span>
            <span className={styles.creditName}>{person.name}</span>
            {instagram[person.id] && <InstagramHandle {...instagram[person.id]} name={person.name} size="sm" />}
          </div>
        ))}
      </div>

      <div className={`container ${styles.bottom}`}>
        <p>
          © {year} {site.copyrightHolder}. All rights reserved.
        </p>
        <p className={styles.independent}>An independent mini-golf community platform.</p>
        <a href="#top" className={styles.toTop}>
          Back to top
          <span className={styles.ball} aria-hidden="true" />
        </a>
      </div>
    </footer>
  );
}
