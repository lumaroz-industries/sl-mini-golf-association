import type { Metadata } from "next";
import Link from "next/link";
import { findNavItem } from "@/config/navigation";
import { getAlbums, getGalleryPageContent } from "@/content/repository";
import { PhotoWall } from "@/components/gallery/PhotoWall";
import { toWall } from "@/components/gallery/toWall";
import g from "@/components/gallery/Gallery.module.css";
import styles from "./page.module.css";

const item = findNavItem("/gallery");

export const metadata: Metadata = {
  title: item.label,
  description: item.summary,
  alternates: { canonical: "/gallery" },
};

const PLACEHOLDER_RATIOS = [1.5, 0.75, 1.33, 1, 1.78, 0.8, 1.5, 1.25, 0.67, 1.5];

export default async function GalleryPage() {
  const [content, albums] = await Promise.all([getGalleryPageContent(), getAlbums()]);
  const { photos, metas } = toWall(albums);

  return (
    <div className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />
      <div className="container">
        <header className={styles.header}>
          <span className="kicker">{content.kicker}</span>
          <h1 className={styles.title}>{content.heading}</h1>
          <p className={styles.intro}>{content.intro}</p>
          {photos.length > 0 && (
            <p className={styles.stats}>
              <span>
                <b>{photos.length}</b> {photos.length === 1 ? "photo" : "photos"}
              </span>
              <span>
                <b>{albums.length}</b> {albums.length === 1 ? "album" : "albums"}
              </span>
            </p>
          )}
        </header>

        {photos.length > 0 ? (
          <PhotoWall photos={photos} albums={metas} filterable allLabel={content.allLabel} />
        ) : (
          <div className={g.empty}>
            <div className={g.emptyWall} aria-hidden="true">
              {PLACEHOLDER_RATIOS.map((a, i) => (
                <span key={i} style={{ "--a": a, "--i": i } as React.CSSProperties} />
              ))}
            </div>
            <div className={g.emptyText}>
              <h2 className={g.emptyTitle}>{content.emptyHeading}</h2>
              <p className={g.emptyBody}>
                {content.emptyBody} Meanwhile, <Link href="/social-media">follow the community on social media</Link>.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
