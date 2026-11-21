import Link from "next/link";
import { navigation } from "@/config/navigation";
import { getActiveSocialLinks, getPeopleByIds, getSiteSettings } from "@/content/repository";
import { Logo } from "@/components/ui/Logo";
import { SocialLinks } from "@/components/ui/SocialLinks";
import styles from "./SiteFooter.module.css";

export async function SiteFooter() {
  const site = await getSiteSettings();
  const social = await getActiveSocialLinks();
  const [owner, developer] = await getPeopleByIds([site.credits.ownerId, site.credits.developerId]);
  const year = new Date().getFullYear();
  const email = site.contact.email;

  return (
    <footer id="site-footer" className={styles.footer}>
      <div className={styles.rule} aria-hidden="true" />
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
            <a className={styles.email} href={`mailto:${email}`}>
              {email}
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
          <div key={person.id} className={styles.credit}>
            <span className={styles.creditRole}>{person.role}</span>
            <span className={styles.creditName}>{person.name}</span>
          </div>
        ))}
      </div>

      <div className={`container ${styles.bottom}`}>
        <p>
          © {year} {site.copyrightHolder}. All rights reserved.
        </p>
        <p className={styles.independent}>An independent mini-golf community platform.</p>
        <a href="#top" className={styles.toTop}>
          Back to top <span aria-hidden="true">↑</span>
        </a>
      </div>
    </footer>
  );
}
