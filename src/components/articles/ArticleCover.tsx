import Image from "next/image";
import type { Article } from "@/content/repository";
import styles from "./Articles.module.css";

/** Cover photo, or a branded fallback when an article has none. */
export function ArticleCover({ article, sizes, priority = false }: { article: Article; sizes: string; priority?: boolean }) {
  if (article.cover) {
    return (
      <Image
        src={article.cover.src}
        alt={article.cover.alt}
        width={article.cover.width}
        height={article.cover.height}
        sizes={sizes}
        priority={priority}
        className={styles.coverImg}
      />
    );
  }
  return (
    <span className={styles.coverFallback} aria-hidden="true">
      <span className={styles.fallbackGrid} />
      <span className={styles.fallbackLabel}>{article.category.label}</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/slmga-icon-dark.svg" alt="" width={90} height={30} className={styles.fallbackMark} />
    </span>
  );
}
