import { SocialIcon } from "./SocialIcon";
import styles from "./InstagramHandle.module.css";

/** Instagram icon + @handle, linking to the profile. */
export function InstagramHandle({ url, handle, name, size = "md" }: { url: string; handle: string; name: string; size?: "sm" | "md" }) {
  return (
    <a className={styles.handle} data-size={size} href={url} target="_blank" rel="noopener noreferrer" aria-label={`${name} on Instagram (${handle}), opens in a new tab`}>
      <span className={styles.icon} aria-hidden="true">
        <SocialIcon platform="instagram" size={size === "sm" ? 14 : 16} />
      </span>
      <span>{handle}</span>
    </a>
  );
}
