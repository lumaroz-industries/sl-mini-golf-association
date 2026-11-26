import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticle, getArticles, getRelatedArticles, getSiteSettings } from "@/content/repository";
import { renderMarkdown } from "@/lib/markdown/render";
import { formatDate } from "@/lib/format";
import { getBaseUrl } from "@/lib/site-url";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { ArticleCover } from "@/components/articles/ArticleCover";
import { ReadingProgress } from "@/components/articles/ReadingProgress";
import { ShareBar } from "@/components/articles/ShareBar";
import { Toc } from "@/components/articles/Toc";
import { Avatar } from "@/components/social/Avatar";
import { WebsiteBy } from "@/components/credits/WebsiteBy";
import a from "@/components/articles/Articles.module.css";
import styles from "./page.module.css";
import prose from "@/styles/prose.module.css";

interface Params {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getArticles()).map((x) => ({ slug: x.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const article = await getArticle((await params).slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: `/articles/${article.slug}` },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.excerpt,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt ?? article.publishedAt,
      authors: [article.author.name],
      section: article.category.label,
      tags: article.tags,
    },
    twitter: { card: "summary_large_image", title: article.title, description: article.excerpt },
  };
}

export default async function ArticlePage({ params }: Params) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  const [{ content, toc }, related, all, site, base] = await Promise.all([
    renderMarkdown(article.body),
    getRelatedArticles(article),
    getArticles(),
    getSiteSettings(),
    getBaseUrl(),
  ]);
  const index = all.findIndex((x) => x.slug === article.slug);
  const newer = index > 0 ? all[index - 1] : undefined;
  const older = index < all.length - 1 ? all[index + 1] : undefined;
  const url = new URL(`/articles/${article.slug}`, base).toString();
  const showToc = toc.filter((t) => t.level === 2).length >= 3;
  // Written by SL Mini Golf Association itself: show the SL mark, not initials.
  const byAssociation = !article.author.photo && article.author.name.trim().toLowerCase() === site.name.trim().toLowerCase();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    author: { "@type": "Person", name: article.author.name },
    publisher: { "@type": "Organization", name: site.name, logo: { "@type": "ImageObject", url: new URL("/brand/icon-512.png", base).toString() } },
    image: [new URL(article.cover?.src ?? `/articles/${article.slug}/opengraph-image`, base).toString()],
    mainEntityOfPage: url,
    articleSection: article.category.label,
    keywords: article.tags.join(", ") || undefined,
  };

  return (
    <>
      <ReadingProgress targetId="article-body" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <article className={styles.article}>
        <header className={styles.hero}>
          <div className={styles.heroGlow} aria-hidden="true" />
          <div className={`container ${styles.heroInner}`}>
            <nav className={styles.crumbs} aria-label="Breadcrumb">
              <Link href="/articles">Articles</Link>
              <span aria-hidden="true">/</span>
              <Link href={`/articles?category=${article.category.id}`} className={a.chip}>
                {article.category.label}
              </Link>
            </nav>
            <h1 className={styles.title}>{article.title}</h1>
            <p className={styles.excerpt}>{article.excerpt}</p>
            <div className={styles.meta}>
              <Avatar name={article.author.name} portrait={article.author.photo} size="sm" brand={byAssociation} />
              <span className={styles.metaAuthor}>
                <b>{article.author.name}</b>
                {article.author.role && <span>{article.author.role}</span>}
              </span>
              <span className={styles.metaFacts}>
                <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
                <span aria-hidden="true">·</span>
                <span>{article.readingMinutes} min read</span>
                {article.updatedAt && article.updatedAt !== article.publishedAt && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      Updated <time dateTime={article.updatedAt}>{formatDate(article.updatedAt)}</time>
                    </span>
                  </>
                )}
              </span>
            </div>
          </div>
          {/* The cover, framed as a wide banner under the title (it no longer sits behind the text). */}
          <div className={`container ${styles.bannerWrap}`}>
            <figure className={styles.banner}>
              <ArticleCover article={article} sizes="(max-width: 1200px) 100vw, 1200px" priority />
              <span className={styles.bannerSheen} aria-hidden="true" />
            </figure>
            {article.cover?.credit && <p className={styles.credit}>Photo: {article.cover.credit}</p>}
          </div>
        </header>

        <div className={`container ${styles.layout}`} data-toc={showToc || undefined}>
          {showToc && (
            <aside className={styles.aside}>
              <Toc items={toc} />
            </aside>
          )}
          <div id="article-body" className={`${prose.prose} ${styles.body}`}>
            {content}
          </div>
        </div>

        <footer className={`container ${styles.footer}`}>
          <div className={styles.footRow}>
            {article.tags.length > 0 && (
              <ul className={styles.tags} aria-label="Tags">
                {article.tags.map((t) => (
                  <li key={t}>#{t}</li>
                ))}
              </ul>
            )}
            <ShareBar url={url} title={article.title} />
            <WebsiteBy />
          </div>

          <div className={styles.authorCard}>
            <Avatar name={article.author.name} portrait={article.author.photo} size="lg" brand={byAssociation} />
            <div>
              <span className={styles.authorLabel}>Written by</span>
              <p className={styles.authorName}>{article.author.name}</p>
              {(article.author.bio ?? article.author.role) && <p className={styles.authorBio}>{article.author.bio ?? article.author.role}</p>}
            </div>
          </div>

          {(newer || older) && (
            <nav className={styles.pager} aria-label="More articles">
              {older ? (
                <Link href={`/articles/${older.slug}`} className={styles.pagerLink}>
                  <span>← Previous</span>
                  <b>{older.title}</b>
                </Link>
              ) : (
                <span />
              )}
              {newer && (
                <Link href={`/articles/${newer.slug}`} className={`${styles.pagerLink} ${styles.pagerNext}`}>
                  <span>Next →</span>
                  <b>{newer.title}</b>
                </Link>
              )}
            </nav>
          )}
        </footer>
      </article>

      {related.length > 0 && (
        <section className={`container ${styles.related}`} aria-labelledby="related-title">
          <h2 id="related-title" className={styles.relatedTitle}>
            Keep reading
          </h2>
          <ul className={a.grid}>
            {related.map((r) => (
              <li key={r.slug} className={a.cell}>
                <ArticleCard article={r} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
