import "server-only";
import { scryptSync, timingSafeEqual } from "node:crypto";
import { getStorage } from "./storage";
import { ContentError } from "./content";

/**
 * Section locks: a locked section can't be changed in the admin without the
 * lock password, and only the lock password can turn locks on or off.
 * The password is never stored — only its scrypt fingerprint (this
 * repository is public).
 */
export const LOCKABLE = {
  international: "International players",
  "top-seven": "Maharashtra's Top 7",
  officials: "Officials",
} as const;
export type LockSection = keyof typeof LOCKABLE;

const SALT = "7e96021614e6b04c9c2673fa4db5c3d8";
const HASH = Buffer.from("1e42cdffa4514be8d7f3a7baac2611614a279b4b55172392add470ed5180c76a", "hex");
const LOCKS_FILE = "src/content/sources/local/locks.json";

export function isLockPassword(pw: unknown): boolean {
  if (typeof pw !== "string" || !pw || pw.length > 200) return false;
  const h = scryptSync(pw, SALT, 32);
  return timingSafeEqual(h, HASH);
}

/** A short pause after a wrong password, so guessing it is slow. */
const slowDown = () => new Promise((r) => setTimeout(r, 1200));

export async function readLocks(): Promise<LockSection[]> {
  const text = await getStorage().readText(LOCKS_FILE);
  try {
    const d = JSON.parse(text ?? "{}") as { locked?: unknown };
    return Array.isArray(d.locked) ? (d.locked.filter((s) => typeof s === "string" && s in LOCKABLE) as LockSection[]) : [];
  } catch {
    return [];
  }
}

export async function isLocked(section: LockSection) {
  return (await readLocks()).includes(section);
}

/** Throws unless the section is unlocked, or the right lock password came with the change. */
export async function assertUnlocked(section: LockSection, password: unknown) {
  if (!(await isLocked(section))) return;
  if (password === undefined || password === "") throw new ContentError(`${LOCKABLE[section]} is locked. Enter the lock password to make changes.`);
  if (!isLockPassword(password)) {
    await slowDown();
    throw new ContentError("Wrong lock password.");
  }
}

/** Checks a lock password (for the unlock box). */
export async function checkLockPassword(password: unknown) {
  if (isLockPassword(password)) return true;
  await slowDown();
  return false;
}

/** Turns locks on or off (needs the lock password). */
export async function saveLocks(locked: unknown, password: unknown): Promise<{ commit: string }> {
  if (!isLockPassword(password)) {
    await slowDown();
    throw new ContentError("Wrong lock password.");
  }
  if (!Array.isArray(locked)) throw new ContentError("The list of locks is missing.");
  const list = [...new Set(locked.map(String))].filter((s): s is LockSection => s in LOCKABLE);
  const commit = await getStorage().commit("Admin: Update section locks", [{ path: LOCKS_FILE, text: JSON.stringify({ locked: list }, null, 2) + "\n" }]);
  return { commit };
}
