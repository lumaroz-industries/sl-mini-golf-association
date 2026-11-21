import "server-only";
import { cache } from "react";
import { ArticleFrontmatter } from "./schema";
import { loadMarkdownCollection } from "./markdown-collection";
import { wordCount } from "@/lib/markdown/render";

/** Articles: src/content/sources/local/articles/*.md (see article-template.md). */
export interface RawArticle extends ArticleFrontmatter {
  body: string;
  readingMinutes: number;
}

export const loadArticles = cache(async (): Promise<RawArticle[]> => {
  const items = await loadMarkdownCollection("articles", ArticleFrontmatter, "Article");
  return items
    .map((a) => ({ ...a, readingMinutes: Math.max(1, Math.round(wordCount(a.body) / 200)) }))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.title.localeCompare(b.title));
});
