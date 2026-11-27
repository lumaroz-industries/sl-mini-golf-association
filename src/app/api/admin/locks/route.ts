import { failure, guard, json } from "@/lib/admin/api";
import { checkLockPassword, readLocks, saveLocks } from "@/lib/admin/locks";

export const dynamic = "force-dynamic";

/** Which sections are locked. */
export async function GET(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  try {
    return json(200, { ok: true, locked: await readLocks() });
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

/** Turn locks on or off (body: { locked: [...], password }). */
export async function PUT(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  try {
    const { locked, password } = (await req.json()) as { locked?: unknown; password?: unknown };
    return json(200, { ok: true, ...(await saveLocks(locked, password)) });
  } catch (e) {
    return failure(e);
  }
}
