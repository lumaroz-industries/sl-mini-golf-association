import { NextResponse } from "next/server";
import { ContactFields, ContactSubmission, MIN_FILL_MS, fieldErrors, type ContactResponse } from "@/lib/contact/schema";
import { DeliveryError, deliverContactMessage, getDeliveryConfig } from "@/lib/contact/delivery";
import { rateLimit } from "@/lib/contact/rate-limit";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 20_000;

function reply(status: number, body: ContactResponse, headers?: HeadersInit) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: Request) {
  if (!getDeliveryConfig()) {
    return reply(503, { ok: false, error: "unavailable", message: "The contact form is not accepting messages yet." });
  }

  // Only accept submissions made from this site.
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) return reply(403, { ok: false, error: "rejected", message: "This request was not accepted." });
    } catch {
      return reply(403, { ok: false, error: "rejected", message: "This request was not accepted." });
    }
  }

  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return reply(413, { ok: false, error: "bad_request", message: "That message is too large to send." });

  let body: unknown;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return reply(413, { ok: false, error: "bad_request", message: "That message is too large to send." });
    body = JSON.parse(raw);
  } catch {
    return reply(400, { ok: false, error: "bad_request", message: "The form could not be read. Please try again." });
  }

  // Validate the visible fields first so people get precise feedback.
  const fields = ContactFields.safeParse(body);
  if (!fields.success) return reply(422, { ok: false, error: "validation", fields: fieldErrors(fields.error) });

  // Spam signals: a filled honeypot or an impossibly fast submission.
  // Bots get a normal-looking success so they do not adapt; nothing is sent.
  const submission = ContactSubmission.safeParse(body);
  if (!submission.success || Date.now() - submission.data.startedAt < MIN_FILL_MS) {
    return reply(200, { ok: true });
  }

  const limit = rateLimit(clientIp(req));
  if (!limit.allowed) {
    return reply(
      429,
      { ok: false, error: "rate_limited", message: "You have sent several messages in a short time. Please wait a few minutes and try again." },
      { "Retry-After": String(limit.retryAfterSeconds) },
    );
  }

  try {
    await deliverContactMessage(fields.data);
  } catch (err) {
    console.error("Contact delivery failed:", err instanceof DeliveryError ? err.message : err);
    return reply(502, { ok: false, error: "delivery_failed", message: "Your message could not be delivered right now. Please try again in a little while." });
  }
  return reply(200, { ok: true });
}
