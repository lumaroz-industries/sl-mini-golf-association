import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSiteSettings, getUpdate, getUpdates, getUpdatesPageContent } from "@/content/repository";
import { renderMarkdown } from "@/lib/markdown/render";
import { getBaseUrl } from "@/lib/site-url";
import { formatEventWhere } from "@/lib/events";
import { UpdateCard } from "@/components/updates/UpdateCard";
import { ShareBar } from "@/components/articles/ShareBar";
import styles from "./page.module.css";

interface Params {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getUpdates()).map((u) => ({ slug: u.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const u = await getUpdate((await params).slug);
  if (!u) return {};
  return {
    title: u.title,
    description: u.summaryText,
    alternates: { canonical: `/updates/${u.slug}` },
    openGraph: { type: "article", title: u.title, description: u.summaryText, publishedTime: u.publishedAt },
    twitter: { card: "summary_large_image", title: u.title, description: u.summaryText },
  };
}

export default async function UpdatePage({ params }: Params) {
  const { slug } = await params;
  const u = await getUpdate(slug);
  if (!u) notFound();
  const [{ content }, all, labels, site, base] = await Promise.all([renderMarkdown(u.body), getUpdates(), getUpdatesPageContent(), getSiteSettings(), getBaseUrl()]);
  const url = new URL(`/updates/${u.slug}`, base).toString();
  const index = all.findIndex((x) => x.slug === u.slug);
  const newer = index > 0 ? all[index - 1] : undefined;
  const older = index < all.length - 1 ? all[index + 1] : undefined;

  // Events are described as sports events; everything else as a news item.
  const jsonLd = u.event
    ? {
        "@context": "https://schema.org",
        "@type": "SportsEvent",
        name: u.title,
        description: u.summaryText,
        startDate: u.event.startTime ? `${u.event.startDate}T${u.event.startTime}:00+05:30` : u.event.startDate,
        endDate: u.event.endDate ?? u.event.startDate,
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        eventStatus: "https://schema.org/EventScheduled",
        location: { "@type": "Place", name: formatEventWhere(u.event), address: { "@type": "PostalAddress", addressLocality: u.event.city, addressCountry: "IN" } },
        url,
        ...(u.image ? { image: [new URL(u.image.src, base).toString()] } : {}),
      }
    : {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        headline: u.title,
        description: u.summaryText,
        datePublished: u.publishedAt,
        author: { "@type": "Organization", name: site.name },
        publisher: { "@type": "Organization", name: site.name },
        mainEntityOfPage: url,
        ...(u.image ? { image: [new URL(u.image.src, base).toString()] } : {}),
      };

  return (
    <div className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className={styles.glow} aria-hidden="true" />
      <div className={`container ${styles.inner}`}>
        <Link href={`/updates#${u.slug}`} className={styles.back}>
          <span aria-hidden="true">←</span> All updates
        </Link>
        <UpdateCard update={u} typeLabel={labels.typeLabels[u.type]} body={content} standalone />
        <ShareBar url={url} title={u.title} />
        {(newer || older) && (
          <nav className={styles.pager} aria-label="More updates">
            {older ? (
              <Link href={`/updates/${older.slug}`} className={styles.pagerLink}>
                <span>← Earlier</span>
                <b>{older.title}</b>
              </Link>
            ) : (
              <span />
            )}
            {newer && (
              <Link href={`/updates/${newer.slug}`} className={`${styles.pagerLink} ${styles.pagerNext}`}>
                <span>Later →</span>
                <b>{newer.title}</b>
              </Link>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
