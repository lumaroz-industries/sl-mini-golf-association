import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAlbum, getAlbums, getGalleryPageContent, getSiteSettings } from "@/content/repository";
import { formatDate } from "@/lib/format";
import { getBaseUrl } from "@/lib/site-url";
import { PhotoWall } from "@/components/gallery/PhotoWall";
import { toWall } from "@/components/gallery/toWall";
import styles from "./page.module.css";

interface Params {
  params: Promise<{ album: string }>;
}

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getAlbums()).map((a) => ({ album: a.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const album = await getAlbum((await params).album);
  if (!album) return {};
  const description = album.description ?? `${album.photos.length} photos${album.city ? ` from ${album.city}` : ""}, ${formatDate(album.date)}.`;
  const og = { url: `/gallery/${album.slug}/og.jpg`, width: 1200, height: 630, alt: album.title };
  return {
    title: `${album.title} — Gallery`,
    description,
    alternates: { canonical: `/gallery/${album.slug}` },
    openGraph: { title: album.title, description, images: [og] },
    twitter: { card: "summary_large_image", title: album.title, description, images: [og.url] },
  };
}

export default async function AlbumPage({ params }: Params) {
  const { album: slug } = await params;
  const album = await getAlbum(slug);
  if (!album) notFound();
  const [content, all, site, base] = await Promise.all([getGalleryPageContent(), getAlbums(), getSiteSettings(), getBaseUrl()]);
  const { photos, metas } = toWall([album]);
  const others = all.filter((a) => a.slug !== album.slug).slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    name: album.title,
    description: album.description,
    datePublished: album.date,
    url: new URL(`/gallery/${album.slug}`, base).toString(),
    publisher: { "@type": "Organization", name: site.name },
    ...(album.city ? { contentLocation: { "@type": "Place", name: album.city } } : {}),
    associatedMedia: album.photos.map((p) => ({
      "@type": "ImageObject",
      contentUrl: new URL(p.src, base).toString(),
      description: p.alt,
      ...(p.caption ? { caption: p.caption } : {}),
      width: p.width,
      height: p.height,
    })),
  };

  return (
    <div className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <header className={styles.hero}>
        <div className={styles.heroMedia} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={album.cover.src} srcSet={album.cover.srcSet} sizes="100vw" alt="" style={{ backgroundImage: `url(${album.cover.blur})` }} />
        </div>
        <div className={styles.heroShade} aria-hidden="true" />
        <div className={`container ${styles.heroInner}`}>
          <Link href="/gallery" className={styles.back}>
            <span aria-hidden="true">←</span> Gallery
          </Link>
          <h1 className={styles.title}>{album.title}</h1>
          <p className={styles.meta}>
            <time dateTime={album.date}>{formatDate(album.date)}</time>
            {album.city && <span>{album.city}</span>}
            <span>{album.photos.length} photos</span>
          </p>
          {album.description && <p className={styles.description}>{album.description}</p>}
        </div>
      </header>

      <div className="container">
        <PhotoWall photos={photos} albums={metas} filterable={false} />
        <p className={styles.removal}>
          {content.removalNote} <Link href="/contact">Contact us</Link>.
        </p>

        {others.length > 0 && (
          <section className={styles.more} aria-labelledby="more-albums">
            <h2 id="more-albums" className={styles.moreTitle}>
              More albums
            </h2>
            <ul className={styles.albums}>
              {others.map((a) => (
                <li key={a.slug}>
                  <Link href={`/gallery/${a.slug}`} className={styles.albumCard}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.cover.srcSet.split(", ")[0].split(" ")[0]} srcSet={a.cover.srcSet} sizes="(max-width: 640px) 100vw, 25vw" alt="" loading="lazy" style={{ backgroundImage: `url(${a.cover.blur})` }} />
                    <span className={styles.albumCardText}>
                      <b>{a.title}</b>
                      <span>{[formatDate(a.date), a.city, `${a.photos.length} photos`].filter(Boolean).join(" · ")}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
