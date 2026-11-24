import type { ImageAsset } from "@/content/schema";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { Avatar } from "./Avatar";
import styles from "./Social.module.css";

interface ChannelFeatureProps {
  url: string;
  name: string;
  handle?: string;
  owner?: { name: string; portrait?: ImageAsset };
  description?: string;
}

/** Cinematic feature panel for a YouTube channel. */
export function ChannelFeature({ url, name, handle, owner, description }: ChannelFeatureProps) {
  return (
    <a className={styles.channel} href={url} target="_blank" rel="noopener noreferrer">
      <span className={styles.spot} aria-hidden="true" />
      {/* A simple YouTube logo animation: the play button pops in, then pulses. */}
      <span className={`${styles.screen} ${styles.ytScreen}`} aria-hidden="true">
        <span className={styles.ytGlow} />
        <span className={styles.ytRing} />
        <span className={styles.ytRing} style={{ animationDelay: "1.2s" }} />
        <span className={styles.ytLogo}>
          <svg viewBox="0 0 68 48" width="150" height="106">
            <path d="M66.5 7.5A8.5 8.5 0 0 0 60.5 1.5C55.2 0 34 0 34 0S12.8 0 7.5 1.5A8.5 8.5 0 0 0 1.5 7.5C0 12.8 0 24 0 24s0 11.2 1.5 16.5a8.5 8.5 0 0 0 6 6C12.8 48 34 48 34 48s21.2 0 26.5-1.5a8.5 8.5 0 0 0 6-6C68 35.2 68 24 68 24s0-11.2-1.5-16.5Z" fill="#ff0033" />
            <path d="M27 34.3 45 24 27 13.7Z" fill="#fff" />
          </svg>
        </span>
      </span>
      <span className={styles.channelInfo}>
        <span className={styles.ytKicker}>
          <SocialIcon platform="youtube" size={18} /> YouTube channel
        </span>
        <span className={styles.channelName}>{name}</span>
        {owner && (
          <span className={styles.channelOwner}>
            <Avatar name={owner.name} portrait={owner.portrait} size="sm" ring={false} />
            <span>by {owner.name}</span>
          </span>
        )}
        {handle && <span className={styles.profileHandle}>{handle}</span>}
        {description && <span className={styles.profileDetail}>{description}</span>}
        <span className={styles.channelCta}>
          Subscribe on YouTube <span aria-hidden="true">↗</span>
          <span className="visually-hidden"> (opens in a new tab)</span>
        </span>
      </span>
    </a>
  );
}
