import type { SocialPlatform } from "@/content/schema";

/**
 * Fixed facts about each supported platform (structural, not CMS content):
 * display name, call to action, and which hosts an official URL may use.
 */
export interface PlatformInfo {
  label: string;
  /** Verb on the link button. */
  action: string;
  hosts: string[];
}

export const PLATFORMS: Record<SocialPlatform, PlatformInfo> = {
  instagram: { label: "Instagram", action: "Follow", hosts: ["instagram.com"] },
  youtube: { label: "YouTube", action: "Subscribe", hosts: ["youtube.com", "youtu.be"] },
  facebook: { label: "Facebook", action: "Follow", hosts: ["facebook.com", "fb.com", "fb.me"] },
  linkedin: { label: "LinkedIn", action: "Follow", hosts: ["linkedin.com"] },
  whatsapp: { label: "WhatsApp", action: "Join", hosts: ["whatsapp.com", "wa.me"] },
};

/** True when the URL is https and on one of the platform's own domains. */
export function urlMatchesPlatform(platform: SocialPlatform, url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    return PLATFORMS[platform].hosts.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/**
 * A readable handle derived from the URL (e.g. instagram.com/name → @name),
 * used when no handle is set in content. Returns undefined when the URL has
 * no meaningful name (e.g. a WhatsApp invite or a YouTube channel id).
 */
export function deriveHandle(platform: SocialPlatform, url: string): string | undefined {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    switch (platform) {
      case "instagram":
        return parts[0] && !["p", "reel", "stories"].includes(parts[0]) ? `@${parts[0]}` : undefined;
      case "youtube":
        return parts[0]?.startsWith("@") ? parts[0] : parts[0] === "c" || parts[0] === "user" ? parts[1] : undefined;
      case "facebook":
        return parts[0] && parts[0] !== "profile.php" && parts[0] !== "groups" ? parts[0] : parts[0] === "groups" ? parts[1] : undefined;
      case "linkedin":
        return ["company", "in", "school", "showcase"].includes(parts[0]) ? parts[1] : undefined;
      default:
        return undefined;
    }
  } catch {
    return undefined;
  }
}
