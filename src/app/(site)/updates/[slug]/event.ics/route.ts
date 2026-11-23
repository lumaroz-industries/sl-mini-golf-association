import { getUpdate, getUpdates } from "@/content/repository";
import { icsFile } from "@/lib/events";
import { getBaseUrl } from "@/lib/site-url";

/** Calendar file for event updates (Apple Calendar, Outlook desktop, others). */
export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getUpdates()).filter((u) => u.event).map((u) => ({ slug: u.slug }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const u = await getUpdate(slug);
  if (!u?.event) return new Response("Not found", { status: 404 });
  const base = await getBaseUrl();
  const url = new URL(`/updates/${u.slug}`, base).toString();
  const stamp = `${u.publishedAt.replace(/-/g, "")}T000000Z`;
  const body = icsFile({ uid: `${u.slug}@${base.host}`, title: u.title, event: u.event, details: u.summaryText, url, stamp });
  return new Response(body, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="${u.slug}.ics"` },
  });
}
