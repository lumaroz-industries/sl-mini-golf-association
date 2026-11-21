import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

/**
 * Loads a folder of Markdown files, each starting with a YAML details block,
 * validates the details against a schema and drops drafts. Used for
 * articles and updates; in the CMS phase this becomes a database query.
 */
const ROOT = path.join(process.cwd(), "src/content/sources/local");

/** Drafts are only included when SHOW_DRAFTS=1 (local previews). Never set it on Vercel. */
export const showDrafts = () => process.env.SHOW_DRAFTS === "1";

type Entry = { slug: string; draft: boolean };

export async function loadMarkdownCollection<S extends z.ZodType<Entry>>(folder: string, schema: S, label: string): Promise<Array<z.infer<S> & { body: string }>> {
  const dir = path.join(ROOT, folder);
  let files: string[] = [];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
  const out: Array<z.infer<S> & { body: string }> = [];
  for (const file of files) {
    const text = await readFile(path.join(dir, file), "utf8");
    const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!m) throw new Error(`${label} ${file} must start with a --- details block ---`);
    const parsed = schema.safeParse(parseYaml(m[1]));
    if (!parsed.success) throw new Error(`Invalid details in ${label.toLowerCase()} ${file}:\n${z.prettifyError(parsed.error)}`);
    const data = parsed.data as z.infer<S>;
    if (`${data.slug}.md` !== file) throw new Error(`${label} ${file}: the file name must match its slug ("${data.slug}.md").`);
    if (data.draft && !showDrafts()) continue;
    out.push({ ...data, body: m[2] });
  }
  return out;
}
