import type { Metadata } from "next";
import Link from "next/link";
import { OutlinedTitle } from "@/components/hero/OutlinedTitle";
import { MagazineStack } from "@/components/hero/MagazineStack";
import hero from "@/components/hero/Hero.module.css";
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

  return (
    <div className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />
      <div className="container">
        <div className={`${hero.split} ${styles.hero}`}>
          <header className={styles.header}>
            <span className="kicker">{content.kicker}</span>
            <OutlinedTitle text={content.heading} className={styles.title} />
            <p className={styles.intro}>{content.intro}</p>
            <p className={hero.stats}>
              <span className={hero.stat}>
                <b>{articles.length}</b> {articles.length === 1 ? "story" : "stories"}
              </span>
              <span className={hero.stat}>
                <b>{categories.length}</b> topics
              </span>
            </p>
          </header>
          <MagazineStack lead={lead} />
        </div>

        {lead ? (
          <div className={styles.body}>
            <ArticleBrowser
              allLabel={content.allLabel}
              categories={categories.map((c) => ({ id: c.id, label: c.label, description: c.description }))}
              lead={{ slug: lead.slug, card: <ArticleCard article={lead} lead /> }}
              items={articles.map((x) => ({
                slug: x.slug,
                category: x.category.id,
                title: x.title,
                publishedAt: x.publishedAt,
                minutes: x.readingMinutes,
                text: [x.title, x.excerpt, x.category.label, x.author.name, ...x.tags].join(" ").toLowerCase(),
                card: <ArticleCard article={x} />,
              }))}
            />
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
