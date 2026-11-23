import { getSiteSettings, getUpdates, getUpdatesPageContent } from "@/content/repository";
import { getBaseUrl } from "@/lib/site-url";

/** RSS 2.0 feed of published updates, newest first. */
export const dynamic = "force-static";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rfc822 = (iso: string) => new Date(`${iso}T09:00:00+05:30`).toUTCString();

export async function GET() {
  const [updates, site, content, base] = await Promise.all([getUpdates(), getSiteSettings(), getUpdatesPageContent(), getBaseUrl()]);
  const self = new URL("/updates/feed.xml", base).toString();
  const items = updates
    .map((u) => {
      const link = new URL(`/updates/${u.slug}`, base).toString();
      return [
        "    <item>",
        `      <title>${esc(u.title)}</title>`,
        `      <link>${link}</link>`,
        `      <guid isPermaLink="true">${link}</guid>`,
        `      <pubDate>${rfc822(u.publishedAt)}</pubDate>`,
        `      <category>${esc(content.typeLabels[u.type])}</category>`,
        `      <description>${esc(u.summaryText)}</description>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(`${site.name} — ${content.kicker}`)}</title>
    <link>${new URL("/updates", base).toString()}</link>
    <description>${esc(content.intro)}</description>
    <language>en-in</language>
    <atom:link href="${self}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
