import "server-only";
import { scryptSync, timingSafeEqual } from "node:crypto";
import { getStorage } from "./storage";
import { ContentError } from "./content";

/**
 * Position locks ("pins"): a player can be locked at their position in the
 * International players section, or in their place in the Top 7 line-up.
 * A locked player can't be moved or removed by anyone in the admin; only
 * the lock password can lock or unlock a position. The password is never
 * stored — only its scrypt fingerprint (this repository is public).
 */
const SALT = "7e96021614e6b04c9c2673fa4db5c3d8";
const HASH = Buffer.from("1e42cdffa4514be8d7f3a7baac2611614a279b4b55172392add470ed5180c76a", "hex");
const LOCKS_FILE = "src/content/sources/local/locks.json";

export interface Pins {
  /** Player slug → position in the International section (1 = first). */
  international: Record<string, number>;
  /** Top 7 place (e.g. "left-1", "center") → player slug. */
  "top-seven": Record<string, string>;
}

export function isLockPassword(pw: unknown): boolean {
  if (typeof pw !== "string" || !pw || pw.length > 200) return false;
  return timingSafeEqual(scryptSync(pw, SALT, 32), HASH);
}

/** A short pause after a wrong password, so guessing it is slow. */
const slowDown = () => new Promise((r) => setTimeout(r, 1200));

export async function readPins(): Promise<Pins> {
  const empty: Pins = { international: {}, "top-seven": {} };
  try {
    const d = JSON.parse((await getStorage().readText(LOCKS_FILE)) ?? "{}") as { pins?: Partial<Pins> };
    return { international: { ...(d.pins?.international ?? {}) }, "top-seven": { ...(d.pins?.["top-seven"] ?? {}) } };
  } catch {
    return empty;
  }
}

const pinsText = (pins: Pins) => JSON.stringify({ pins }, null, 2) + "\n";

/** Refuses an International list that moves or drops a locked player. */
export async function assertInternationalPins(list: unknown) {
  const pins = (await readPins()).international;
  const arr = Array.isArray(list) ? list.map(String) : [];
  for (const [slug, pos] of Object.entries(pins)) {
    if (arr[pos - 1] !== slug) throw new ContentError(`A locked player must stay at position ${pos}. Unlock their position first (lock password needed).`);
  }
}

/** Refuses a Top 7 line-up that changes a locked place. */
export async function assertTopSevenPins(lineup: Record<string, unknown>) {
  const pins = (await readPins())["top-seven"];
  for (const [slot, slug] of Object.entries(pins)) {
    if (String(lineup[slot] ?? "") !== slug) throw new ContentError("A locked place in the Top 7 can't be changed. Unlock it first (lock password needed).");
  }
}

/** True if the player is locked anywhere (so they can't be deleted). */
export async function isPinned(slug: string) {
  const p = await readPins();
  return slug in p.international || Object.values(p["top-seven"]).includes(slug);
}

/** Checks a lock password (for the lock box). */
export async function checkLockPassword(password: unknown) {
  if (isLockPassword(password)) return true;
  await slowDown();
  return false;
}

/**
 * Locks or unlocks one position (needs the lock password). The position is
 * taken from what is published now, so it is exactly what the website shows.
 */
export async function setPin(input: { section?: unknown; key?: unknown; locked?: unknown; password?: unknown }, current: { international: string[]; topSeven: Record<string, string | null> }): Promise<{ commit: string; pins: Pins }> {
  if (!isLockPassword(input.password)) {
    await slowDown();
    throw new ContentError("Wrong lock password.");
  }
  const pins = await readPins();
  const key = String(input.key ?? "");
  if (input.section === "international") {
    if (input.locked) {
      const pos = current.international.indexOf(key) + 1;
      if (!pos) throw new ContentError("Publish the list with this player in it first, then lock their position.");
      pins.international[key] = pos;
    } else delete pins.international[key];
  } else if (input.section === "top-seven") {
    if (input.locked) {
      const slug = current.topSeven[key];
      if (!slug) throw new ContentError("Publish a player in this place first, then lock it.");
      pins["top-seven"][key] = slug;
    } else delete pins["top-seven"][key];
  } else throw new ContentError("Unknown section.");
  const commit = await getStorage().commit(`Admin: ${input.locked ? "Lock" : "Unlock"} a position (${String(input.section)})`, [{ path: LOCKS_FILE, text: pinsText(pins) }]);
  return { commit, pins };
}
