import "server-only";
import { getPeopleByIds, getPeopleInstagram, getSiteSettings, getSocialPageContent } from "@/content/repository";

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  instagram?: { url: string; handle: string };
  /** Cut-out photo (from the Social Media page) or the portrait. */
  photo?: { src: string; width: number; height: number; cutout: boolean };
}

/** The founder and the website's designer, for credits around the admin. */
export async function getTeam(): Promise<{ owner: TeamMember; dev: TeamMember }> {
  const site = await getSiteSettings();
  const [owner, dev] = await getPeopleByIds([site.credits.ownerId, site.credits.developerId]);
  const [insta, social] = await Promise.all([getPeopleInstagram(), getSocialPageContent()]);
  const member = (p: typeof owner): TeamMember => {
    const cut = social.accounts.find((a) => a.personId === p.id && a.cutout)?.cutout;
    return {
      id: p.id,
      name: p.name,
      role: p.role,
      instagram: insta[p.id],
      photo: cut ? { ...cut, cutout: true } : p.portrait ? { ...p.portrait, cutout: false } : undefined,
    };
  };
  return { owner: member(owner), dev: member(dev) };
}

/** Instagram direct-message link for a profile URL. */
export const dmLink = (url: string) => {
  const user = new URL(url).pathname.split("/").filter(Boolean)[0];
  return user ? `https://ig.me/m/${user}` : url;
};

export const ADMIN_VERSION = "1.0";
