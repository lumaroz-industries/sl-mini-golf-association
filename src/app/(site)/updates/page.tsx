import type { Metadata } from "next";
import Link from "next/link";
import { findNavItem } from "@/config/navigation";
import { getPeopleByIds, getPeopleInstagram, getSiteSettings, getUpdates, getUpdatesPageContent } from "@/content/repository";
import { updateTypes } from "@/content/schema";
import { renderMarkdown } from "@/lib/markdown/render";
import { UpdateCard } from "@/components/updates/UpdateCard";
import { UpdatesTimeline } from "@/components/updates/UpdatesTimeline";
import u from "@/components/updates/Updates.module.css";
import styles from "./page.module.css";

const item = findNavItem("/updates");

export const metadata: Metadata = {
  title: item.label,
  description: item.summary,
  alternates: { canonical: "/updates", types: { "application/rss+xml": "/updates/feed.xml" } },
};

export default async function UpdatesPage() {
  const [content, updates, site, instagram] = await Promise.all([getUpdatesPageContent(), getUpdates(), getSiteSettings(), getPeopleInstagram()]);
  const [dev] = await getPeopleByIds([site.credits.developerId]);
  const devInsta = instagram[dev.id];
  const bodies = await Promise.all(updates.map((x) => renderMarkdown(x.body)));
  const card = (i: number) => <UpdateCard update={updates[i]} typeLabel={content.typeLabels[updates[i].type]} body={bodies[i].content} />;
  const pinned = updates.map((x, i) => ({ x, i })).filter(({ x }) => x.pinned);
  const rest = updates.map((x, i) => ({ x, i })).filter(({ x }) => !x.pinned);

  return (
    <div className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={`container ${styles.inner}`}>
        <header className={styles.header}>
          <span className="kicker">{content.kicker}</span>
          <h1 className={styles.title}>{content.heading}</h1>
          <p className={styles.intro}>{content.intro}</p>
          <a className={styles.rss} href="/updates/feed.xml">
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="5" cy="19" r="2.2" fill="currentColor" />
              <path d="M3 10.5a10.5 10.5 0 0 1 10.5 10.5M3 3.5A17.5 17.5 0 0 1 20.5 21" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
            RSS feed
          </a>
        </header>

        {updates.length === 0 ? (
          <>
          <div className={styles.emptyRow}>
            <div className={`${u.timeline} ${styles.emptyLine}`} aria-hidden="true">
              <span className={u.line} />
              <span className={u.ball} />
              <span className={u.cup} />
            </div>
            <div className={u.empty}>
              <h2 className={u.emptyTitle}>{content.emptyHeading}</h2>
              <p className={u.emptyBody}>
                {content.emptyBody} Meanwhile, <Link href="/social-media">follow the community on social media</Link>.
              </p>
            </div>
          </div>
            {dev && devInsta && (
              <a className={`${u.builtBy} ${u.builtByStatic}`} href={devInsta.url} target="_blank" rel="noopener noreferrer">
                <span className={u.flagPin} aria-hidden="true" />
                <span className={u.builtText}>
                  Built by <b>{dev.name}</b>
                </span>
                <span className={u.builtHandle}>
                  {devInsta.handle} <span aria-hidden="true">↗</span>
                  <span className="visually-hidden"> on Instagram (opens in a new tab)</span>
                </span>
              </a>
            )}
          </>
        ) : (
          <div className={styles.body}>
            {pinned.length > 0 && (
              <div className={styles.pinned}>
                {pinned.map(({ x, i }) => (
                  <div key={x.slug}>{card(i)}</div>
                ))}
              </div>
            )}
            {rest.length > 0 && (
              <UpdatesTimeline
                credit={dev && devInsta ? { name: dev.name, url: devInsta.url, handle: devInsta.handle } : undefined}
                allLabel={content.allLabel}
                types={updateTypes.map((t) => ({ id: t, label: content.typeLabels[t], count: rest.filter(({ x }) => x.type === t).length }))}
                items={rest.map(({ x, i }) => ({ slug: x.slug, type: x.type, publishedAt: x.publishedAt, card: card(i) }))}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
