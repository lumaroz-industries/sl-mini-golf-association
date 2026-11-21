import type { SocialLink } from "@/content/schema";
import { SocialIcon, platformLabels } from "./SocialIcon";
import styles from "./SocialLinks.module.css";

interface SocialLinksProps {
  /** Only links with an official URL should be passed in. */
  links: Array<SocialLink & { url: string }>;
  className?: string;
}

export function SocialLinks({ links, className }: SocialLinksProps) {
  if (links.length === 0) return null;
  return (
    <ul className={[styles.list, className].filter(Boolean).join(" ")} aria-label="Social media">
      {links.map(({ platform, url }) => (
        <li key={platform}>
          <a className={styles.link} href={url} target="_blank" rel="noopener noreferrer">
            <SocialIcon platform={platform} />
            <span className="visually-hidden">{platformLabels[platform]} (opens in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
