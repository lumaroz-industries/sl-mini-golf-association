import Link from "next/link";
import type { ImageAsset } from "@/content/schema";
import type { Metadata } from "next";
import { findNavItem } from "@/config/navigation";
import { PLATFORMS, deriveHandle } from "@/config/social-platforms";
import { getActiveSocialLinks, getPeople, getSiteSettings, getSocialPageContent } from "@/content/repository";
import type { SocialPlatform } from "@/content/schema";
import { ChannelFeature } from "@/components/social/ChannelFeature";
import { Orbit } from "@/components/social/Orbit";
import { ProfileCard } from "@/components/social/ProfileCard";
import { Spotlight } from "@/components/social/Spotlight";
import styles from "./page.module.css";
import social from "@/components/social/Social.module.css";

const item = findNavItem("/social-media");

export const metadata: Metadata = {
  title: item.label,
  description: item.summary,
  alternates: { canonical: "/social-media" },
};

type Card = { group: "organisation" | "person" | "channel" } & (
  | {
      kind: "profile";
      id: string;
      span: "normal" | "half" | "wide" | "full";
      platform: SocialPlatform;
      url: string;
      name: string;
      handle?: string;
      tags: string[];
      detail?: string;
      brand?: boolean;
      spotlight?: "gold" | "diamond" | "silver" | "tricolor" | "maroon" | "orange";
      portrait?: ImageAsset;
      wholePhoto?: boolean;
    }
  | {
      kind: "channel";
      id: string;
      span: "full";
      url: string;
      name: string;
      handle?: string;
      owner?: { name: string };
      description?: string;
    }
);

const TYPE_TAG = { organisation: "Organisation", person: "Person", channel: "Channel" } as const;

/** The page is grouped: organisations, then people, then channels. */
const GROUPS = [
  { id: "organisation", title: "Federation & associations", note: "The bodies running mini golf in India and Maharashtra." },
  { id: "person", title: "The people", note: "The founder, and the designer behind this website." },
  { id: "channel", title: "Watch", note: "Mini golf on video." },
] as const;

export default async function SocialMediaPage() {
  const [content, site, official, people] = await Promise.all([getSocialPageContent(), getSiteSettings(), getActiveSocialLinks(), getPeople()]);
  const person = (id?: string) => {
    if (!id) return undefined;
    const p = people.find((x) => x.id === id);
    if (!p) throw new Error(`Social account references unknown person "${id}"`);
    return p;
  };

  // Cards use initials rather than photos (a deliberate, uniform look) — except
  // spotlight people (designer: diamond, founder: gold), who show their photo.
  // The association's own accounts lead the grid, then everything else in content order.
  const cards: Card[] = [
    ...official.map<Card>((link) => ({
      kind: "profile",
      group: "organisation",
      id: `official-${link.platform}`,
      span: "wide",
      platform: link.platform,
      url: link.url,
      name: site.name,
      handle: link.handle ?? deriveHandle(link.platform, link.url),
      tags: ["Official"],
      detail: link.description,
      brand: true,
    })),
    ...content.accounts.map<Card>((a) => {
      const p = person(a.personId);
      const name = a.name ?? p!.name;
      const handle = a.handle ?? deriveHandle(a.platform, a.url);
      if (a.type === "channel" && a.platform === "youtube") {
        return { kind: "channel", group: "channel", id: a.id, span: "full", url: a.url, name, handle, owner: p && { name: p.name }, description: a.description };
      }
      return {
        kind: "profile",
        group: a.type,
        id: a.id,
        span: a.span ?? (a.featured ? "wide" : "normal"),
        spotlight: a.spotlight,
        portrait: a.cutout ?? a.avatar ?? (a.spotlight && a.spotlight !== "tricolor" ? p?.portrait : undefined),
        wholePhoto: Boolean(a.avatar),
        platform: a.platform,
        url: a.url,
        name,
        handle,
        tags: [a.type === "person" && p ? p.role : TYPE_TAG[a.type], a.label].filter((t): t is string => Boolean(t)),
        detail: a.description,
      };
    }),
  ];

  const platforms = [...new Set(cards.map((c) => (c.kind === "channel" ? "youtube" : c.platform)))].map((p) => PLATFORMS[p].label);
  const orbitMembers = cards.map((c) =>
    c.kind === "channel"
      ? { id: c.id, name: c.name, youtube: true }
      : { id: c.id, name: c.name, finish: c.spotlight, portrait: c.spotlight === "gold" || c.spotlight === "diamond" ? c.portrait : undefined },
  );

  return (
    <div className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />

      <section className={`container ${styles.hero}`} aria-labelledby="social-title">
        <div className={styles.heroText}>
          <span className="kicker">{content.kicker}</span>
          <h1 id="social-title" className={styles.title}>
            {(() => {
              const words = content.heading.trim().split(/\s+/);
              const last = words.pop();
              return (
                <>
                  {words.join(" ")} <span className={styles.titleOutline}>{last}</span>
                </>
              );
            })()}
          </h1>
          <p className={styles.intro}>{content.intro}</p>
          {cards.length > 0 && (
            <p className={styles.stats}>
              <span className={styles.stat}>
                <b>{cards.length}</b> {cards.length === 1 ? "account" : "accounts"}
              </span>
              <span className={styles.stat}>{platforms.join(" · ")}</span>
            </p>
          )}
        </div>
        <Orbit members={orbitMembers} />
      </section>

      <div className={`container ${styles.cards}`}>
        {cards.length > 0 ? (
          GROUPS.filter((g) => cards.some((c) => c.group === g.id)).map((g, gi) => {
            const list = cards.filter((c) => c.group === g.id);
            if (!list.length) return null;
            return (
              <section key={g.id} className={styles.group} aria-labelledby={`group-${g.id}`}>
                <header className={styles.groupHead}>
                  <h2 id={`group-${g.id}`} className={styles.groupTitle}>
                    <span className={styles.groupNo} aria-hidden="true">
                      {String(gi + 1).padStart(2, "0")}
                    </span>
                    {g.title}
                    <span className={styles.groupCount}>{list.length}</span>
                  </h2>
                  <p className={styles.groupNote}>{g.note}</p>
                </header>
                <Spotlight className={social.bento}>
                  {list.map((c, i) => (
                    <li key={c.id} className={social.cell} data-span={c.span} style={{ "--i": i } as React.CSSProperties}>
                      {c.kind === "channel" ? (
                        <ChannelFeature url={c.url} name={c.name} handle={c.handle} owner={c.owner} description={c.description} />
                      ) : (
                        <ProfileCard {...c} wide={c.span !== "normal"} full={c.span === "full"} />
                      )}
                    </li>
                  ))}
                </Spotlight>
              </section>
            );
          })
        ) : (
          <p className={styles.empty}>{content.emptyState}</p>
        )}
        <aside className={styles.invite}>
          <div>
            <span className={styles.inviteKicker}>Get listed</span>
            <p className={styles.inviteTitle}>Run a mini-golf page or channel in India?</p>
            <p className={styles.inviteBody}>Associations, clubs and players can be added here. Send us the link.</p>
          </div>
          <Link href="/contact" className={styles.inviteBtn}>
            Contact us <span aria-hidden="true">→</span>
          </Link>
        </aside>
        <p className={styles.note}>{content.note}</p>
      </div>
    </div>
  );
}
