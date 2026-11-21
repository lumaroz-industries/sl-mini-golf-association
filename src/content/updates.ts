import "server-only";
import { cache } from "react";
import { UpdateFrontmatter } from "./schema";
import { loadMarkdownCollection } from "./markdown-collection";

/** Updates: src/content/sources/local/updates/*.md (see update-template.md). */
export type RawUpdate = UpdateFrontmatter & { body: string };

export const loadUpdates = cache(async (): Promise<RawUpdate[]> => {
  const items = await loadMarkdownCollection("updates", UpdateFrontmatter, "Update");
  return items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.title.localeCompare(b.title));
});
