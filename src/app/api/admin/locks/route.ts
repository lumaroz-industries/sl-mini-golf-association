import { failure, guard, json } from "@/lib/admin/api";
import { readSection, readTopSeven } from "@/lib/admin/content";
import { playerSections } from "@/content/schema";
import { checkLockPassword, readPins, setPin } from "@/lib/admin/locks";

export const dynamic = "force-dynamic";

/** The locked positions. */
export async function GET(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  try {
    return json(200, { ok: true, pins: await readPins() });
  } catch (e) {
    return failure(e);
  }
}

/** Check a lock password (body: { password }). */
export async function POST(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  try {
    const { password } = (await req.json()) as { password?: unknown };
    const ok = await checkLockPassword(password);
    return json(ok ? 200 : 403, ok ? { ok: true } : { ok: false, message: "Wrong lock password." });
  } catch (e) {
    return failure(e);
  }
}

/** Lock or unlock one position (body: { section, key, locked, password }). */
export async function PUT(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  try {
    const input = (await req.json()) as { section?: unknown; key?: unknown; locked?: unknown; password?: unknown };
    const [lists, topSeven] = await Promise.all([Promise.all(playerSections.map((s) => readSection(s))), readTopSeven()]);
    const sections = Object.fromEntries(playerSections.map((s, i) => [s, lists[i]])) as Parameters<typeof setPin>[1]["sections"];
    return json(200, { ok: true, ...(await setPin(input, { sections, topSeven })) });
  } catch (e) {
    return failure(e);
  }
}
