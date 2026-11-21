import Link from "next/link";
import type { Article } from "@/content/repository";
import { formatDate } from "@/lib/format";
import { ArticleCover } from "./ArticleCover";
import styles from "./Articles.module.css";

export function ArticleCard({ article, lead = false }: { article: Article; lead?: boolean }) {
  return (
    <Link href={`/articles/${article.slug}`} className={styles.card} data-lead={lead || undefined}>
      <span className={styles.cardCover}>
        <ArticleCover article={article} sizes={lead ? "(max-width: 900px) 100vw, 60vw" : "(max-width: 600px) 100vw, (max-width: 1080px) 50vw, 33vw"} priority={lead} />
      </span>
      <span className={styles.cardBody}>
        <span className={styles.cardMeta}>
          <span className={styles.chip}>{article.category.label}</span>
          {lead && <span className={styles.leadTag}>Featured</span>}
        </span>
        <span className={styles.cardTitle}>{article.title}</span>
        <span className={styles.cardExcerpt}>{article.excerpt}</span>
        <span className={styles.byline}>
          <span>{article.author.name}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
          <span aria-hidden="true">·</span>
          <span>{article.readingMinutes} min read</span>
        </span>
      </span>
    </Link>
  );
}
