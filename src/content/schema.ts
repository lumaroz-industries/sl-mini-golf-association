/**
 * Content schema — the contract between editable content and the UI.
 *
 * Everything described here is intended to become manageable through the
 * future admin CMS. Presentation logic (layout, motion, the 3D experience)
 * must never live in content; content must never be hardcoded in components.
 *
 * The same schemas will validate admin form input and database rows later.
 */
import { z } from "zod";
import { PLATFORMS, urlMatchesPlatform } from "@/config/social-platforms";

/** Optional string that treats "" as "not provided". */
const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .pipe(z.url().optional());

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .pipe(z.email().optional());

export const socialPlatforms = ["instagram", "youtube", "facebook", "linkedin", "whatsapp"] as const;
export const SocialPlatform = z.enum(socialPlatforms);
export type SocialPlatform = z.infer<typeof SocialPlatform>;

export const SocialLink = z
  .object({
    platform: SocialPlatform,
    /** Official URL. Leave empty until provided — the platform is then hidden. */
    url: optionalUrl,
    /** Optional display handle, e.g. "@slminigolf". Derived from the URL when empty. */
    handle: optionalText,
    /** Optional one-line description of what the channel shares. */
    description: optionalText,
  })
  .superRefine((link, ctx) => {
    if (!link.url) return;
    if (!urlMatchesPlatform(link.platform, link.url)) {
      ctx.addIssue({
        code: "custom",
        path: ["url"],
        message: `The ${PLATFORMS[link.platform].label} link must be an https:// address on ${PLATFORMS[link.platform].hosts.join(" or ")}.`,
      });
    }
  });
export type SocialLink = z.infer<typeof SocialLink>;

export const ImageAsset = z.object({
  src: z.string().min(1),
  alt: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export type ImageAsset = z.infer<typeof ImageAsset>;

export const Person = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
  /** Short name shown large behind them on their homepage card (defaults to the first name). */
  nickname: z.string().min(1).optional(),
  /** Real photograph only. When absent, a reserved branded frame is shown. */
  portrait: ImageAsset.optional(),
});
export type Person = z.infer<typeof Person>;

export const SiteSettings = z.object({
  name: z.string().min(1),
  shortName: z.string().min(1),
  /** Reusable platform description (meta description, footer, intro). */
  description: z.string().min(1),
  tagline: z.tuple([z.string(), z.string()]),
  supportingStatement: z.string().min(1),
  contact: z.object({
    /** Official association email. Hidden until provided. */
    email: optionalEmail,
  }),
  social: z.array(SocialLink),
  credits: z.object({
    ownerId: z.string(),
    developerId: z.string(),
  }),
  copyrightHolder: z.string().min(1),
  /** Absolute production URL, once known. Used for canonical/OG URLs. */
  siteUrl: optionalUrl,
  seo: z.object({
    title: z.string().min(1),
    keywords: z.array(z.string()),
  }),
  notice: optionalText,
});
export type SiteSettings = z.infer<typeof SiteSettings>;

export const MessageItem = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
});
export type MessageItem = z.infer<typeof MessageItem>;

export const HomeContent = z.object({
  hero: z.object({
    title: z.string().min(1),
    taglineLines: z.tuple([z.string(), z.string()]),
    supporting: z.string().min(1),
  }),
  intro: z.object({
    kicker: z.string().min(1),
    heading: z.string().min(1),
    /** Long version — the dedicated Association Introduction section. */
    body: z.string().min(1),
    /** Short version — the cinematic overlay during the journey. */
    short: z.string().min(1),
  }),
  visionMission: z.object({
    kicker: z.string().min(1),
    vision: z.string().min(1),
    mission: z.string().min(1),
  }),
  community: z.object({
    kicker: z.string().min(1),
    heading: z.string().min(1),
    items: z.array(MessageItem).min(1),
  }),
  people: z.object({
    kicker: z.string().min(1),
    heading: z.string().min(1),
    memberIds: z.array(z.string()).min(1),
  }),
});
export type HomeContent = z.infer<typeof HomeContent>;

export const ContactContent = z.object({
  kicker: z.string().min(1),
  heading: z.string().min(1),
  intro: z.string().min(1),
  /** Shown in place of the email address until it is provided. */
  emailPending: z.string().min(1),
  formHeading: z.string().min(1),
  /** Shown when the form's email delivery is not configured yet. */
  formUnavailable: z.string().min(1),
  successHeading: z.string().min(1),
  successBody: z.string().min(1),
});
export type ContactContent = z.infer<typeof ContactContent>;

/** What kind of account a social card represents (drives its tag and layout). */
export const socialAccountTypes = ["organisation", "person", "channel"] as const;
export const SocialAccountType = z.enum(socialAccountTypes);
export type SocialAccountType = z.infer<typeof SocialAccountType>;

/**
 * An account listed on the social media page (other organisations, people,
 * channels). The association's OWN channels live in site settings instead,
 * so the footer, menu and structured data only ever show official profiles.
 * Cards appear in the order listed here.
 */
export const SocialAccount = z
  .object({
    id: z.string().min(1),
    type: SocialAccountType,
    platform: SocialPlatform,
    url: z.url(),
    /** Display name. Optional when `personId` is set (the person's name is used). */
    name: optionalText,
    /** Links the account to an entry in people.json (name, role, portrait). */
    personId: optionalText,
    /** Display handle; derived from the URL when empty. */
    handle: optionalText,
    /** Short tag, e.g. a city or "India". */
    label: optionalText,
    description: optionalText,
    /** Shown as a wider card. */
    featured: z.boolean().optional().default(false),
    /** Profile picture for this account's card; for a YouTube channel, the cover picture of its video panel. */
    avatar: ImageAsset.optional(),
    /** Cut-out photo (transparent background) shown large on a full-row card. */
    cutout: ImageAsset.optional(),
    /** Card width in the grid: a third (default), half, two-thirds ("wide") or the full row. */
    span: z.enum(["normal", "half", "wide", "full"]).optional(),
    /** Highlighted finish: "diamond" (the site's designer), "gold" (the founder), "silver", "tricolor" (national body), "maroon", "orange". */
    spotlight: z.enum(["diamond", "gold", "silver", "tricolor", "maroon", "orange"]).optional(),
  })
  .superRefine((acc, ctx) => {
    if (!urlMatchesPlatform(acc.platform, acc.url)) {
      ctx.addIssue({
        code: "custom",
        path: ["url"],
        message: `"${acc.id}": the ${PLATFORMS[acc.platform].label} link must be an https:// address on ${PLATFORMS[acc.platform].hosts.join(" or ")}.`,
      });
    }
    if (!acc.name && !acc.personId) {
      ctx.addIssue({ code: "custom", path: ["name"], message: `"${acc.id}": set a name or a personId.` });
    }
  });
export type SocialAccount = z.infer<typeof SocialAccount>;

export const SocialPageContent = z.object({
  kicker: z.string().min(1),
  heading: z.string().min(1),
  intro: z.string().min(1),
  accounts: z.array(SocialAccount),
  /** Shown if there are no accounts at all. */
  emptyState: z.string().min(1),
  /** Small print under the cards. */
  note: z.string().min(1),
});
export type SocialPageContent = z.infer<typeof SocialPageContent>;

/* ---------------------------------------------------------------- articles */

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens, e.g. my-first-article.");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD.");

export const ArticleCategory = z.object({
  id: slug,
  label: z.string().min(1),
  description: z.string().min(1),
});
export type ArticleCategory = z.infer<typeof ArticleCategory>;

/** Either someone from people.json, or a guest writer. */
export const ArticleAuthor = z.union([
  z.object({ personId: z.string().min(1) }),
  z.object({ name: z.string().min(1), bio: optionalText, photo: ImageAsset.optional() }),
]);
export type ArticleAuthor = z.infer<typeof ArticleAuthor>;

/** The details block at the top of each article's Markdown file. */
export const ArticleFrontmatter = z.object({
  title: z.string().min(1).max(140),
  slug,
  excerpt: z.string().min(1).max(320),
  category: slug,
  author: ArticleAuthor,
  publishedAt: isoDate,
  updatedAt: isoDate.optional(),
  cover: ImageAsset.extend({ credit: optionalText }).optional(),
  tags: z.array(z.string().min(1)).default([]),
  featured: z.boolean().default(false),
  /** Drafts never appear on the live site. */
  draft: z.boolean().default(false),
});
export type ArticleFrontmatter = z.infer<typeof ArticleFrontmatter>;

export const ArticlesPageContent = z.object({
  kicker: z.string().min(1),
  heading: z.string().min(1),
  intro: z.string().min(1),
  emptyHeading: z.string().min(1),
  emptyBody: z.string().min(1),
  allLabel: z.string().min(1),
});
export type ArticlesPageContent = z.infer<typeof ArticlesPageContent>;

/* ----------------------------------------------------------------- updates */

export const updateTypes = ["announcement", "tournament", "result", "community", "platform"] as const;
export const UpdateType = z.enum(updateTypes);
export type UpdateType = z.infer<typeof UpdateType>;

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour time, e.g. 09:30 or 18:00.");
/** https:// link or a path on this site (e.g. /contact). */
const linkTarget = z.string().refine((v) => v.startsWith("/") || /^https:\/\//.test(v), "Use an https:// link or a path on this site starting with /.");

/** Optional event details: turns an update into an event card (dates in India time). */
export const UpdateEvent = z
  .object({
    startDate: isoDate,
    endDate: isoDate.optional(),
    startTime: hhmm.optional(),
    endTime: hhmm.optional(),
    city: z.string().min(1),
    venue: optionalText,
    registrationUrl: z.string().regex(/^https:\/\//, "Use an https:// link.").optional(),
  })
  .refine((e) => !e.endDate || e.endDate >= e.startDate, { message: "endDate must be on or after startDate.", path: ["endDate"] });
export type UpdateEvent = z.infer<typeof UpdateEvent>;

export const UpdateFrontmatter = z.object({
  title: z.string().min(1).max(140),
  slug,
  type: UpdateType,
  publishedAt: isoDate,
  /** Optional short summary for link previews and the RSS feed; otherwise taken from the text. */
  summary: z.string().max(300).optional(),
  image: ImageAsset.extend({ credit: optionalText }).optional(),
  /** A button, e.g. { label: "See the post", url: "https://instagram.com/..." }. */
  action: z.object({ label: z.string().min(1).max(40), url: linkTarget }).optional(),
  /** Slug of a related article. */
  article: slug.optional(),
  event: UpdateEvent.optional(),
  pinned: z.boolean().default(false),
  draft: z.boolean().default(false),
});
export type UpdateFrontmatter = z.infer<typeof UpdateFrontmatter>;

export const UpdatesPageContent = z.object({
  kicker: z.string().min(1),
  heading: z.string().min(1),
  intro: z.string().min(1),
  emptyHeading: z.string().min(1),
  emptyBody: z.string().min(1),
  allLabel: z.string().min(1),
  typeLabels: z.record(UpdateType, z.string().min(1)),
});
export type UpdatesPageContent = z.infer<typeof UpdatesPageContent>;

/* ----------------------------------------------------------------- gallery */

/** One photo as listed in an album's album.yaml (edited by people). */
export const GalleryPhotoEntry = z.object({
  file: z.string().min(1),
  /** Describes the photo for screen readers and search engines. Required. */
  alt: z.string().trim().min(1, "Add alt text (a short description of the photo)."),
  caption: optionalText,
});

/** album.yaml — the editable details of an album. */
export const GalleryCategory = z.object({ id: slug, label: z.string().min(1), description: z.string().min(1) });
export type GalleryCategory = z.infer<typeof GalleryCategory>;

export const GalleryAlbumFile = z.object({
  title: z.string().min(1).max(100),
  date: isoDate,
  /** One of gallery-categories.json (e.g. tournaments, players). Optional: uncategorised albums are grouped under "More albums". */
  category: slug.optional(),
  city: optionalText,
  description: optionalText,
  /** File name of the cover photo; defaults to the first photo. */
  cover: optionalText,
  draft: z.boolean().default(false),
  photos: z.array(GalleryPhotoEntry).default([]),
});
export type GalleryAlbumFile = z.infer<typeof GalleryAlbumFile>;

/** photos.json — generated by `npm run gallery`, never edited by hand. */
export const GalleryManifest = z.record(
  z.string(),
  z.object({
    id: z.string(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    widths: z.array(z.number().int().positive()).min(1),
    blur: z.string().startsWith("data:image/"),
    hash: z.string(),
  }),
);
export type GalleryManifest = z.infer<typeof GalleryManifest>;

export const GalleryPageContent = z.object({
  kicker: z.string().min(1),
  heading: z.string().min(1),
  intro: z.string().min(1),
  emptyHeading: z.string().min(1),
  emptyBody: z.string().min(1),
  allLabel: z.string().min(1),
  /** Shown on album pages: how to ask for a photo to be removed. */
  removalNote: z.string().min(1),
});
export type GalleryPageContent = z.infer<typeof GalleryPageContent>;

/* ----------------------------------------------------------------- players */

const medalCount = z.number().int().min(0).max(999).optional();

export const playerLevels = ["district", "state", "national", "international"] as const;
export const PlayerLevel = z.enum(playerLevels);
export type PlayerLevel = z.infer<typeof PlayerLevel>;
export const PLAYER_LEVEL_LABELS: Record<PlayerLevel, string> = { district: "District", state: "State", national: "National", international: "International" };

/** One competition result. Give a medal, a position, or neither (= participated). */
export const PlayerResult = z.object({
  event: z.string().trim().min(1).max(140),
  year: z.number().int().min(1990).max(2100),
  level: PlayerLevel,
  /** e.g. "Men's singles", "Junior", "Team" */
  category: optionalText,
  /** Where it was held, e.g. "Pran Buri, Thailand" */
  place: optionalText,
  medal: z.enum(["gold", "silver", "bronze"]).optional(),
  /** Final position, e.g. 4 */
  position: z.number().int().min(1).max(999).optional(),
});
export type PlayerResult = z.infer<typeof PlayerResult>;

/** A player in the Maharashtra directory: src/content/sources/local/players/<slug>.json */
export const Player = z.object({
  slug,
  name: z.string().trim().min(1).max(60),
  gender: z.enum(["female", "male"]).optional(),
  /** District in Maharashtra, e.g. "Nagpur" */
  district: optionalText,
  /**
   * Which card the player gets (chosen by the admins): "state" (Maharashtra),
   * "national" (India) or "international" (diamond). Default: state.
   */
  card: z.enum(["state", "national", "international"]).optional(),
  /** Real photograph only (portrait works best). Without one, cards show initials. */
  photo: ImageAsset.optional(),
  /**
   * Medal totals shown on the cards. Leave a count out (rather than 0) when it
   * is not known yet. If no totals are given, they are counted from `results`.
   */
  medals: z.object({ gold: medalCount, silver: medalCount, bronze: medalCount }).optional(),
  results: z.array(PlayerResult).default([]),
  /** Optional short paragraphs for the player's own page. */
  bio: optionalText,
  draft: z.boolean().default(false),
});
export type Player = z.infer<typeof Player>;

/** A place in the Top 7 line-up, pointing at a player record. */
export const FeaturedSlot = z.object({
  slug,
  /** Where the card sits in the line-up: girls on the left and centre, boys on the right. */
  side: z.enum(["left", "center", "right"]),
  /**
   * Optional fixed place on a left/right side: 1 = next to the centre card,
   * 2 = one further out, 3 = the outer edge. Without it, players fill the
   * free places in the order listed. Layout only — never shown as a rank.
   */
  place: z.number().int().min(1).max(3).optional(),
});
export type FeaturedSlot = z.infer<typeof FeaturedSlot>;

export const PlayersPageContent = z
  .object({
    kicker: z.string().min(1),
    heading: z.string().min(1),
    intro: z.string().min(1),
    /** Small line under the cards, e.g. how the players were chosen. */
    note: z.string().min(1),
    /** Shown on cards whose player has not been announced yet. */
    revealLabel: z.string().min(1),
    featured: z.array(FeaturedSlot).max(7),
    directory: z.object({
      kicker: z.string().min(1),
      heading: z.string().min(1),
      intro: z.string().min(1),
      emptyHeading: z.string().min(1),
      emptyBody: z.string().min(1),
    }),
  })
  .superRefine((c, ctx) => {
    const count = (side: string) => c.featured.filter((p) => p.side === side).length;
    if (count("left") > 3) ctx.addIssue({ code: "custom", path: ["featured"], message: "At most 3 players on the left." });
    if (count("right") > 3) ctx.addIssue({ code: "custom", path: ["featured"], message: "At most 3 players on the right." });
    if (count("center") > 1) ctx.addIssue({ code: "custom", path: ["featured"], message: "Only 1 player in the centre." });
    for (const side of ["left", "right"] as const) {
      const places = c.featured.filter((p) => p.side === side && p.place !== undefined).map((p) => p.place);
      if (new Set(places).size !== places.length) ctx.addIssue({ code: "custom", path: ["featured"], message: `Two players share the same place on the ${side}.` });
    }
    if (c.featured.some((p) => p.side === "center" && p.place !== undefined)) ctx.addIssue({ code: "custom", path: ["featured"], message: "The centre card does not take a place." });
    const slugs = c.featured.map((p) => p.slug);
    if (new Set(slugs).size !== slugs.length) ctx.addIssue({ code: "custom", path: ["featured"], message: "Each player appears only once in the Top 7." });
  });
export type PlayersPageContent = z.infer<typeof PlayersPageContent>;

