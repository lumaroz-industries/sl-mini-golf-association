import { Analytics } from "@vercel/analytics/next";
import { SiteHeader } from "@/components/nav/SiteHeader";
import { SiteFooter } from "@/components/footer/SiteFooter";
import { getActiveSocialLinks, getPeopleByIds, getPeopleInstagram, getPeopleStyle, getSiteSettings } from "@/content/repository";
import { getBaseUrl } from "@/lib/site-url";
import { SiteIntro, type IntroPerson } from "@/sections/home/SiteIntro";

/** The public website: header, footer and organisation structured data. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const site = await getSiteSettings();
  const social = await getActiveSocialLinks();
  const base = await getBaseUrl();
  // The founder and the website's designer, introduced in the homepage opening.
  const [[owner, dev], instagram, style] = await Promise.all([getPeopleByIds([site.credits.ownerId, site.credits.developerId]), getPeopleInstagram(), getPeopleStyle()]);
  const introPeople: IntroPerson[] = [
    { name: owner.name, role: owner.role, photo: style[owner.id]?.cutout?.src ?? owner.portrait?.src, handle: instagram[owner.id]?.handle, finish: "gold" },
    { name: dev.name, role: dev.role, photo: style[dev.id]?.cutout?.src ?? dev.portrait?.src, handle: instagram[dev.id]?.handle, finish: "diamond", ghost: dev.nickname },
  ];
  // Structured data: lets search engines connect the site to its official profiles.
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    description: site.description,
    url: base.toString(),
    logo: new URL("/brand/icon-512.png", base).toString(),
    ...(site.contact.email ? { email: site.contact.email } : {}),
    ...(social.length ? { sameAs: social.map((s) => s.url) } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization).replace(/</g, "\\u003c") }} />
      {/* Homepage opening animation; lives here (not in the page) so it covers the screen. */}
      <SiteIntro tagline={site.tagline} people={introPeople} />
      {/* Vercel Web Analytics: visitors and page views on the public site (the admin is not counted). */}
      <Analytics />
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <SiteHeader siteName={site.name} tagline={site.tagline} email={site.contact.email} social={social} />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
