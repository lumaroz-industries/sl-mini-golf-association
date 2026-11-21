import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { ArticleFrontmatter } from "./schema";
import { wordCount } from "@/lib/markdown/render";

/**
 * Local article source: one Markdown file per article in
 * src/content/sources/local/articles/, each starting with a YAML details
 * block. In the CMS phase this becomes a database query returning the same
 * shape.
 */
const DIR = path.join(process.cwd(), "src/content/sources/local/articles");

/** Drafts are only included when SHOW_DRAFTS=1 (local previews). Never set it on Vercel. */
const showDrafts = () => process.env.SHOW_DRAFTS === "1";

export interface RawArticle extends ArticleFrontmatter {
  body: string;
  readingMinutes: number;
}

function splitFrontmatter(file: string, text: string): { data: unknown; body: string } {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error(`Article ${file} must start with a --- details block ---`);
  return { data: parseYaml(m[1]), body: m[2] };
}

export const loadArticles = cache(async (): Promise<RawArticle[]> => {
  let files: string[] = [];
  try {
    files = (await readdir(DIR)).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
  const articles: RawArticle[] = [];
  for (const file of files) {
    const { data, body } = splitFrontmatter(file, await readFile(path.join(DIR, file), "utf8"));
    const parsed = ArticleFrontmatter.safeParse(data);
    if (!parsed.success) throw new Error(`Invalid details in article ${file}:\n${z.prettifyError(parsed.error)}`);
    if (`${parsed.data.slug}.md` !== file) throw new Error(`Article ${file}: the file name must match its slug ("${parsed.data.slug}.md").`);
    if (parsed.data.draft && !showDrafts()) continue;
    articles.push({ ...parsed.data, body, readingMinutes: Math.max(1, Math.round(wordCount(body) / 200)) });
  }
  return articles.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.title.localeCompare(b.title));
});
