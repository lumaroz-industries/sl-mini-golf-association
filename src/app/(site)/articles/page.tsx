import type { Metadata } from "next";
import Link from "next/link";
import { findNavItem } from "@/config/navigation";
import { getArticleCategories, getArticles, getArticlesPageContent } from "@/content/repository";
import { ArticleBrowser } from "@/components/articles/ArticleBrowser";
import { ArticleCard } from "@/components/articles/ArticleCard";
import a from "@/components/articles/Articles.module.css";
import styles from "./page.module.css";

const item = findNavItem("/articles");

export const metadata: Metadata = {
  title: item.label,
  description: item.summary,
  alternates: { canonical: "/articles" },
};

export default async function ArticlesPage() {
  const [content, articles, categories] = await Promise.all([getArticlesPageContent(), getArticles(), getArticleCategories()]);
  const lead = articles.find((x) => x.featured) ?? articles[0];
  const rest = articles.filter((x) => x !== lead);

  return (
    <div className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />
      <div className="container">
        <header className={styles.header}>
          <span className="kicker">{content.kicker}</span>
          <h1 className={styles.title}>{content.heading}</h1>
          <p className={styles.intro}>{content.intro}</p>
        </header>

        {lead ? (
          <div className={styles.body}>
            <ArticleCard article={lead} lead />
            {rest.length > 0 && (
              <ArticleBrowser
                allLabel={content.allLabel}
                categories={categories.map((c) => ({ id: c.id, label: c.label, count: rest.filter((x) => x.category.id === c.id).length }))}
                items={rest.map((x) => ({ slug: x.slug, category: x.category.id, card: <ArticleCard article={x} /> }))}
              />
            )}
          </div>
        ) : (
          <div className={a.empty}>
            <span className={a.emptyPutt} aria-hidden="true" />
            <h2 className={a.emptyTitle}>{content.emptyHeading}</h2>
            <p className={a.emptyBody}>{content.emptyBody}</p>
            <ul className={styles.topics} aria-label="Coming topics">
              {categories.map((c) => (
                <li key={c.id} className={a.chip}>
                  {c.label}
                </li>
              ))}
            </ul>
            <p className={styles.emptyLinks}>
              Have a story to share? <Link href="/contact">Get in touch</Link> · Meanwhile, <Link href="/social-media">follow the community</Link>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
