import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { z } from "zod";
import { Player } from "./schema";
import { showDrafts } from "./markdown-collection";

/** Player records: src/content/sources/local/players/<slug>.json */
const DIR = path.join(process.cwd(), "src/content/sources/local/players");

export const loadPlayers = cache(async (): Promise<Player[]> => {
  let files: string[] = [];
  try {
    files = (await readdir(DIR)).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const out: Player[] = [];
  for (const f of files) {
    const parsed = Player.safeParse(JSON.parse(await readFile(path.join(DIR, f), "utf8")));
    if (!parsed.success) throw new Error(`Invalid player ${f}:\n${z.prettifyError(parsed.error)}`);
    if (`${parsed.data.slug}.json` !== f) throw new Error(`Player ${f}: the file name must match its slug ("${parsed.data.slug}.json").`);
    if (parsed.data.draft && !showDrafts()) continue;
    out.push(parsed.data);
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
});
