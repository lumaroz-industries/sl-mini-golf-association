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

export const SocialLink = z.object({
  platform: SocialPlatform,
  /** Official URL. Leave empty until provided — the platform is then hidden. */
  url: optionalUrl,
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
