import type { MetadataRoute } from "next";
import { navigation } from "@/config/navigation";
import { getArticles, getUpdates } from "@/content/repository";
import { getBaseUrl } from "@/lib/site-url";

/** Live routes, published articles and updates; placeholders are excluded. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [base, articles, updates] = await Promise.all([getBaseUrl(), getArticles(), getUpdates()]);
  const pages: MetadataRoute.Sitemap = navigation
    .filter((item) => item.status === "live")
    .map((item) => ({ url: new URL(item.href, base).toString(), changeFrequency: "monthly", priority: item.href === "/" ? 1 : 0.7 }));
  const posts: MetadataRoute.Sitemap = articles.map((a) => ({
    url: new URL(`/articles/${a.slug}`, base).toString(),
    lastModified: a.updatedAt ?? a.publishedAt,
    changeFrequency: "yearly",
    priority: 0.6,
  }));
  const news: MetadataRoute.Sitemap = updates.map((u) => ({
    url: new URL(`/updates/${u.slug}`, base).toString(),
    lastModified: u.publishedAt,
    changeFrequency: "yearly",
    priority: 0.5,
  }));
  return [...pages, ...posts, ...news];
}
