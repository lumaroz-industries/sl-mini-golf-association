import Image from "next/image";
import Link from "next/link";
import type { Update } from "@/content/repository";
import { formatDate } from "@/lib/format";
import { CopyLink } from "./CopyLink";
import { EventPanel } from "./EventPanel";
import { NewBadge } from "./NewBadge";
import prose from "@/styles/prose.module.css";
import styles from "./Updates.module.css";

interface UpdateCardProps {
  update: Update;
  typeLabel: string;
  /** Rendered Markdown body. */
  body: React.ReactNode;
  /** On its own page the title is the H1 and links are not repeated. */
  standalone?: boolean;
}

export function UpdateCard({ update: u, typeLabel, body, standalone = false }: UpdateCardProps) {
  const Title = standalone ? "h1" : "h2";
  const external = u.action && /^https?:/.test(u.action.url);
  return (
    <article id={standalone ? undefined : u.slug} className={styles.card} data-pinned={u.pinned || undefined} data-type={u.type}>
      <header className={styles.cardHead}>
        <span className={styles.chip}>{typeLabel}</span>
        {u.pinned && <span className={styles.pin}>Pinned</span>}
        <NewBadge publishedAt={u.publishedAt} />
        <time dateTime={u.publishedAt} className={styles.date}>
          {formatDate(u.publishedAt)}
        </time>
      </header>

      <Title className={styles.title} data-standalone={standalone || undefined}>
        {standalone ? u.title : <Link href={`/updates/${u.slug}`}>{u.title}</Link>}
      </Title>

      {u.image && (
        <figure className={styles.image}>
          <Image src={u.image.src} alt={u.image.alt} width={u.image.width} height={u.image.height} sizes="(max-width: 760px) 100vw, 680px" />
          {u.image.credit && <figcaption>Photo: {u.image.credit}</figcaption>}
        </figure>
      )}

      <div className={`${prose.prose} ${styles.body}`}>{body}</div>

      {u.event && <EventPanel slug={u.slug} title={u.title} details={u.summaryText} event={u.event} />}

      {(u.action || u.article) && (
        <div className={styles.links}>
          {u.action &&
            (external ? (
              <a className={styles.primary} href={u.action.url} target="_blank" rel="noopener noreferrer">
                {u.action.label} <span aria-hidden="true">↗</span>
              </a>
            ) : (
              <Link className={styles.primary} href={u.action.url}>
                {u.action.label} <span aria-hidden="true">→</span>
              </Link>
            ))}
          {u.article && (
            <Link className={styles.articleLink} href={`/articles/${u.article.slug}`}>
              <span className={styles.articleKicker}>Read the article</span>
              <span className={styles.articleTitle}>{u.article.title}</span>
            </Link>
          )}
        </div>
      )}

      {!standalone && (
        <footer className={styles.cardFoot}>
          <CopyLink path={`/updates/${u.slug}`} />
          <Link href={`/updates/${u.slug}`} className={styles.open}>
            Open <span aria-hidden="true">→</span>
          </Link>
        </footer>
      )}
    </article>
  );
}
