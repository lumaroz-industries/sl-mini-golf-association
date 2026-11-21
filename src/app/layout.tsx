import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Manrope } from "next/font/google";
import { SiteHeader } from "@/components/nav/SiteHeader";
import { SiteFooter } from "@/components/footer/SiteFooter";
import { getActiveSocialLinks, getSiteSettings } from "@/content/repository";
import { getBaseUrl } from "@/lib/site-url";
import "@/styles/globals.css";

const clash = localFont({
  src: [
    { path: "../fonts/ClashDisplay-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/ClashDisplay-600.woff2", weight: "600", style: "normal" },
    { path: "../fonts/ClashDisplay-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-clash",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  const base = await getBaseUrl();
  return {
    metadataBase: base,
    title: { default: site.seo.title, template: `%s — ${site.name}` },
    description: site.description,
    keywords: site.seo.keywords,
    applicationName: site.name,
    openGraph: {
      type: "website",
      siteName: site.name,
      title: site.seo.title,
      description: site.description,
      locale: "en_IN",
    },
    twitter: { card: "summary_large_image", title: site.seo.title, description: site.description },
  };
}

export const viewport: Viewport = {
  themeColor: "#050807",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const site = await getSiteSettings();
  const social = await getActiveSocialLinks();

  return (
    <html lang="en-IN" className={`${clash.variable} ${manrope.variable}`}>
      <body id="top">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <SiteHeader siteName={site.name} tagline={site.tagline} email={site.contact.email} social={social} />
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
