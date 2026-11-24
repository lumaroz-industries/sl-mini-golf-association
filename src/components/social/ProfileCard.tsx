import Image from "next/image";
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
  /** The portrait is a ready-made profile picture: show it whole. */
  wholePhoto?: boolean;
  /** Highlighted finish: "diamond", "gold", "silver" or "tricolor". */
  spotlight?: "gold" | "diamond" | "silver" | "tricolor";
  /** Full-row card: details on the left, a large photo or monogram on the right. */
  full?: boolean;
}

/** A whole-card link styled like a social profile. */
export function ProfileCard({ platform, url, name, handle, tags, detail, portrait, brand, wide, spotlight, wholePhoto, full }: ProfileCardProps) {
  const info = PLATFORMS[platform];
  return (
    <a className={styles.profile} data-wide={wide || undefined} data-full={full || undefined} data-photo={(full && portrait) || undefined} data-spotlight={spotlight} href={url} target="_blank" rel="noopener noreferrer">
      {spotlight && <span className={styles.texture} data-kind={spotlight} aria-hidden="true" />}
      <span className={styles.spot} aria-hidden="true" />
      {spotlight === "diamond" && <span className={styles.sparkles} aria-hidden="true" />}
      {spotlight === "diamond" && <span className={styles.sheen} aria-hidden="true" />}
      {spotlight === "tricolor" && <span className={styles.tricolor} aria-hidden="true" />}
      {full && portrait && (
        // A person's photo: large, borderless, fading softly into the card.
        <span className={styles.fullPhoto} aria-hidden="true">
          <Image src={portrait.src} alt="" width={portrait.width} height={portrait.height} sizes="(max-width: 760px) 100vw, 45vw" />
        </span>
      )}
      {full && !portrait && (
        <span className={styles.fullSide}>
          <span className={styles.halo} aria-hidden="true" />
          <Avatar name={name} brand={brand} size="xl" />
        </span>
      )}
      <span className={styles.profileTop}>
        {!full && <Avatar name={name} portrait={portrait} brand={brand} size="lg" whole={wholePhoto} />}
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
