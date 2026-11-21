import type { MetadataRoute } from "next";
import { navigation } from "@/config/navigation";
import { getAlbums, getArticles, getUpdates } from "@/content/repository";
import { getBaseUrl } from "@/lib/site-url";

/** Live routes, articles, updates and gallery albums (with images); placeholders are excluded. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [base, articles, updates, albums] = await Promise.all([getBaseUrl(), getArticles(), getUpdates(), getAlbums()]);
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
  const galleries: MetadataRoute.Sitemap = albums.map((a) => ({
    url: new URL(`/gallery/${a.slug}`, base).toString(),
    lastModified: a.date,
    changeFrequency: "monthly",
    priority: 0.5,
    images: a.photos.slice(0, 50).map((p) => new URL(p.src, base).toString()),
  }));
  return [...pages, ...posts, ...news, ...galleries];
}
