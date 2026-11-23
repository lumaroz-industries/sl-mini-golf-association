import "server-only";
import { isSignedIn, sameOrigin } from "./auth";
import { ContentError } from "./content";
import { StorageError } from "./storage";

export const json = (status: number, body: unknown) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Every admin API call: signed in, and (for changes) sent from this site. */
export async function guard(req: Request): Promise<Response | null> {
  if (req.method !== "GET" && !sameOrigin(req)) return json(403, { ok: false, message: "This request was not accepted." });
  if (!(await isSignedIn())) return json(401, { ok: false, message: "Your session has ended — please sign in again." });
  return null;
}

export function failure(e: unknown): Response {
  if (e instanceof ContentError) return json(400, { ok: false, message: e.message, issues: e.issues });
  if (e instanceof StorageError) return json(502, { ok: false, message: e.message === "not-found" ? "The repository or branch was not found — check ADMIN_GITHUB_REPO and ADMIN_GITHUB_BRANCH." : e.message });
  console.error("[admin]", e);
  return json(500, { ok: false, message: "Something went wrong. Please try again." });
}
