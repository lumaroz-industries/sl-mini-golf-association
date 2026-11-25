import { SiteHeader } from "@/components/nav/SiteHeader";
import { SiteFooter } from "@/components/footer/SiteFooter";
import { getActiveSocialLinks, getSiteSettings } from "@/content/repository";
import { getBaseUrl } from "@/lib/site-url";
import { SiteIntro } from "@/sections/home/SiteIntro";

/** The public website: header, footer and organisation structured data. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const site = await getSiteSettings();
  const social = await getActiveSocialLinks();
  const base = await getBaseUrl();
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
      <SiteIntro tagline={site.tagline} />
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
