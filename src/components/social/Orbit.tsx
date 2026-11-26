import Image from "next/image";
import type { ImageAsset } from "@/content/schema";
import styles from "./Social.module.css";

export interface OrbitMember {
  id: string;
  name: string;
  portrait?: ImageAsset;
  /** Colour theme of the bubble, matching the account's card. */
  finish?: string;
  youtube?: boolean;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^[A-Z]/.test(w))
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();

/** Decorative constellation: the community orbiting the SL mark, each in its own colours. */
export function Orbit({ members }: { members: OrbitMember[] }) {
  const inner = members.filter((_, i) => i % 2 === 0);
  const outer = members.filter((_, i) => i % 2 === 1);
  const node = (m: OrbitMember) => (
    <span className={styles.node} data-finish={m.youtube ? "youtube" : m.finish}>
      {m.youtube ? (
        <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
          <path d="M9 7.5v9l7.5-4.5z" fill="#fff" />
        </svg>
      ) : m.portrait ? (
        <Image src={m.portrait.src} alt="" width={96} height={96} sizes="56px" />
      ) : (
        <b>{initials(m.name)}</b>
      )}
    </span>
  );
  const ring = (list: OrbitMember[], cls: string) => (
    <span className={`${styles.ring} ${cls}`}>
      {list.map((m, i) => (
        <span key={m.id} className={styles.satellite} style={{ "--a": `${(360 / list.length) * i}deg` } as React.CSSProperties}>
          <span className={styles.upright}>{node(m)}</span>
        </span>
      ))}
    </span>
  );
  return (
    <div className={styles.orbit} aria-hidden="true">
      <span className={styles.orbitGlow} />
      {ring(inner, styles.ringInner)}
      {ring(outer, styles.ringOuter)}
      <span className={styles.core}>
        <span className={styles.coreRing} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/slmga-icon-dark.svg" alt="" width={92} height={31} />
      </span>
    </div>
  );
}
