/**
 * Site routes. Structural (part of the app), not CMS content.
 * `status: "coming-soon"` routes render the shared placeholder page until
 * the real page is built.
 */
export type RouteStatus = "live" | "coming-soon";

export interface NavItem {
  label: string;
  href: string;
  status: RouteStatus;
  /** Short line used on the placeholder page and in metadata. */
  summary: string;
}

export const navigation: NavItem[] = [
  { label: "Home", href: "/", status: "live", summary: "SL Mini Golf Association" },
  { label: "Players", href: "/players", status: "live", summary: "Profiles of the players shaping Indian mini golf." },
  { label: "Officials", href: "/officials", status: "live", summary: "The officials behind mini golf in India and Maharashtra." },
  { label: "Articles", href: "/articles", status: "live", summary: "Stories, journeys and features from the mini-golf community." },
  { label: "Updates", href: "/updates", status: "live", summary: "News and announcements from the platform." },
  { label: "Gallery", href: "/gallery", status: "live", summary: "Moments from courses, competitions and the community." },
  { label: "Social Media", href: "/social-media", status: "live", summary: "Follow SL Mini Golf Association across platforms." },
  { label: "Contact", href: "/contact", status: "live", summary: "Get in touch with SL Mini Golf Association." },
];

export function findNavItem(href: string): NavItem {
  const item = navigation.find((n) => n.href === href);
  if (!item) throw new Error(`Route ${href} is not registered in navigation.ts`);
  return item;
}

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
