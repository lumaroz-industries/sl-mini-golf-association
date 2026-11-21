import type { ImageAsset } from "@/content/schema";
import { Avatar } from "./Avatar";
import styles from "./Social.module.css";

interface OrbitProps {
  members: Array<{ id: string; name: string; portrait?: ImageAsset }>;
}

/** Decorative constellation: the community orbiting the SL mark. */
export function Orbit({ members }: OrbitProps) {
  const inner = members.filter((_, i) => i % 2 === 0);
  const outer = members.filter((_, i) => i % 2 === 1);
  const ring = (list: typeof members, cls: string) => (
    <span className={`${styles.ring} ${cls}`}>
      {list.map((m, i) => (
        <span key={m.id} className={styles.satellite} style={{ "--a": `${(360 / list.length) * i}deg` } as React.CSSProperties}>
          <span className={styles.upright}>
            <Avatar name={m.name} portrait={m.portrait} size="sm" />
          </span>
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/slmga-icon-dark.svg" alt="" width={92} height={31} />
      </span>
    </div>
  );
}
