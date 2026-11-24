import Image from "next/image";
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
  /** Cover picture shown in the video panel, like a thumbnail. */
  cover?: ImageAsset;
}

/** Cinematic feature panel for a YouTube channel. */
export function ChannelFeature({ url, name, handle, owner, description, cover }: ChannelFeatureProps) {
  return (
    <a className={styles.channel} href={url} target="_blank" rel="noopener noreferrer">
      <span className={styles.spot} aria-hidden="true" />
      <span className={styles.screen} aria-hidden="true">
        {cover && <Image className={styles.screenCover} src={cover.src} alt="" width={cover.width} height={cover.height} sizes="(max-width: 900px) 100vw, 55vw" />}
        <span className={styles.screenGlow} />
        <span className={styles.screenFloor} />
        <span className={styles.screenCup} />
        <span className={styles.screenBall} />
        <span className={styles.play}>
          <svg viewBox="0 0 24 24" width="30" height="30">
            <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
          </svg>
        </span>
        <span className={styles.screenBar}>
          <span />
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
