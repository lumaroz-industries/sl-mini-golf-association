import Image from "next/image";
import type { ImageAsset } from "@/content/schema";
import styles from "./Social.module.css";

const SKIP = new Set(["of", "and", "the", "&"]);

/** "Minigolf Federation of India" → "MFI", "Suyash Lahane" → "SL". */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => w && !SKIP.has(w.toLowerCase()))
    .slice(0, 3)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

interface AvatarProps {
  name: string;
  portrait?: ImageAsset;
  size?: "sm" | "md" | "lg";
  ring?: boolean;
  /** Show the SL mark instead of initials (the association itself). */
  brand?: boolean;
}

/** Real portrait when available, otherwise a branded monogram — never a stand-in face. */
export function Avatar({ name, portrait, size = "md", ring = true, brand = false }: AvatarProps) {
  return (
    <span className={styles.avatar} data-size={size} data-ring={ring || undefined}>
      <span className={styles.avatarInner}>
        {brand ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/brand/slmga-icon-dark.svg" alt="" width={60} height={20} className={styles.brandMark} />
        ) : portrait ? (
          <Image src={portrait.src} alt="" width={160} height={160} sizes="96px" className={styles.avatarImg} />
        ) : (
          <span className={styles.monogram} data-len={initials(name).length}>
            {initials(name)}
          </span>
        )}
      </span>
    </span>
  );
}
