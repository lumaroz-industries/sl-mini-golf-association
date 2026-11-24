import { PLATFORMS } from "@/config/social-platforms";
import type { ImageAsset, SocialPlatform } from "@/content/schema";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { Avatar } from "./Avatar";
import styles from "./Social.module.css";

export interface ProfileCardProps {
  platform: SocialPlatform;
  url: string;
  name: string;
  handle?: string;
  /** Small chips, e.g. ["Official"] or ["Organisation", "Pune"]. */
  tags: string[];
  /** Role or description line under the handle. */
  detail?: string;
  portrait?: ImageAsset;
  /** Use the SL mark as the avatar (the association's own accounts). */
  brand?: boolean;
  wide?: boolean;
  /** Highlighted card: "gold" (the site's designer) or "silver" (a step quieter). */
  spotlight?: "gold" | "silver";
}

/** A whole-card link styled like a social profile. */
export function ProfileCard({ platform, url, name, handle, tags, detail, portrait, brand, wide, spotlight }: ProfileCardProps) {
  const info = PLATFORMS[platform];
  return (
    <a className={styles.profile} data-wide={wide || undefined} data-spotlight={spotlight} href={url} target="_blank" rel="noopener noreferrer">
      <span className={styles.spot} aria-hidden="true" />
      <span className={styles.profileTop}>
        <Avatar name={name} portrait={portrait} brand={brand} size="lg" />
        <span className={styles.platformBadge} title={info.label}>
          <SocialIcon platform={platform} size={18} />
        </span>
      </span>
      <span className={styles.profileBody}>
        {tags.length > 0 && (
          <span className={styles.tags}>
            {tags.map((t) => (
              <span key={t} className={styles.chip}>
                {t}
              </span>
            ))}
          </span>
        )}
        <span className={styles.profileName}>{name}</span>
        {handle && <span className={styles.profileHandle}>{handle}</span>}
        {detail && <span className={styles.profileDetail}>{detail}</span>}
      </span>
      <span className={styles.profileCta}>
        {info.action} on {info.label}
        <span className={styles.ctaArrow} aria-hidden="true">
          ↗
        </span>
        <span className="visually-hidden"> (opens in a new tab)</span>
      </span>
    </a>
  );
}
