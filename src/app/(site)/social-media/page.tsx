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

type Card =
  | {
      kind: "profile";
      id: string;
      span: "normal" | "wide";
      platform: SocialPlatform;
      url: string;
      name: string;
      handle?: string;
      tags: string[];
      detail?: string;
      brand?: boolean;
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
    };

const TYPE_TAG = { organisation: "Organisation", person: "Person", channel: "Channel" } as const;

export default async function SocialMediaPage() {
  const [content, site, official, people] = await Promise.all([getSocialPageContent(), getSiteSettings(), getActiveSocialLinks(), getPeople()]);
  const person = (id?: string) => {
    if (!id) return undefined;
    const p = people.find((x) => x.id === id);
    if (!p) throw new Error(`Social account references unknown person "${id}"`);
    return p;
  };

  // Cards use initials rather than photos (a deliberate, uniform look) — except a
  // "spotlight" account (the site's designer), which is wide, gold and shows the photo.
  // The association's own accounts lead the grid, then everything else in content order.
  const cards: Card[] = [
    ...official.map<Card>((link) => ({
      kind: "profile",
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
        return { kind: "channel", id: a.id, span: "full", url: a.url, name, handle, owner: p && { name: p.name }, description: a.description };
      }
      return {
        kind: "profile",
        id: a.id,
        span: a.featured || a.spotlight ? "wide" : "normal",
        spotlight: a.spotlight,
        portrait: a.avatar ?? (a.spotlight ? p?.portrait : undefined),
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
  const orbitMembers = cards.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />

      <section className={`container ${styles.hero}`} aria-labelledby="social-title">
        <div className={styles.heroText}>
          <span className="kicker">{content.kicker}</span>
          <h1 id="social-title" className={styles.title}>
            {content.heading}
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
          <Spotlight className={social.bento}>
            {cards.map((c, i) => (
              <li key={c.id} className={social.cell} data-span={c.span} style={{ "--i": i } as React.CSSProperties}>
                {c.kind === "channel" ? (
                  <ChannelFeature url={c.url} name={c.name} handle={c.handle} owner={c.owner} description={c.description} />
                ) : (
                  <ProfileCard {...c} wide={c.span === "wide"} />
                )}
              </li>
            ))}
          </Spotlight>
        ) : (
          <p className={styles.empty}>{content.emptyState}</p>
        )}
        <p className={styles.note}>{content.note}</p>
      </div>
    </div>
  );
}
