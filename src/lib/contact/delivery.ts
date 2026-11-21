import "server-only";
import type { ContactFields } from "./schema";

/**
 * Email delivery for the contact form, via Resend's HTTP API (free tier).
 *
 * Delivery is OFF until both RESEND_API_KEY and CONTACT_TO_EMAIL are set.
 * While it is off, the page shows the form as unavailable and the API
 * refuses submissions — the site never pretends a message was sent.
 */
interface DeliveryConfig {
  apiKey: string;
  to: string;
  from: string;
  endpoint: string;
}

export function getDeliveryConfig(): DeliveryConfig | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = process.env.CONTACT_TO_EMAIL?.trim();
  if (!apiKey || !to) return null;
  return {
    apiKey,
    to,
    // Resend's shared test sender works without a custom domain, but only
    // delivers to the email address that owns the Resend account.
    from: process.env.CONTACT_FROM_EMAIL?.trim() || "SL Mini Golf Association <onboarding@resend.dev>",
    // Override only for local testing against a mock provider.
    endpoint: process.env.RESEND_API_URL?.trim() || "https://api.resend.com/emails",
  };
}

export function isContactDeliveryConfigured(): boolean {
  return getDeliveryConfig() !== null;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();

export class DeliveryError extends Error {}

export async function deliverContactMessage(fields: ContactFields): Promise<void> {
  const config = getDeliveryConfig();
  if (!config) throw new DeliveryError("Contact delivery is not configured");

  const subject = `Website message: ${oneLine(fields.subject)}`;
  const text = [`From: ${oneLine(fields.name)} <${fields.email}>`, `Subject: ${oneLine(fields.subject)}`, "", fields.message, "", "— Sent from the SL Mini Golf Association website contact form"].join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#0b1210">
      <p style="margin:0 0 4px;color:#00a86b;font-size:12px;letter-spacing:.12em;text-transform:uppercase">Website contact form</p>
      <h2 style="margin:0 0 16px;font-size:20px">${escapeHtml(oneLine(fields.subject))}</h2>
      <p style="margin:0 0 16px"><strong>${escapeHtml(oneLine(fields.name))}</strong> &lt;${escapeHtml(fields.email)}&gt;</p>
      <div style="white-space:pre-wrap;padding:16px;border-left:3px solid #00a86b;background:#f3f6f5">${escapeHtml(fields.message)}</div>
      <p style="margin:16px 0 0;color:#6f7a75;font-size:12px">Reply to this email to answer ${escapeHtml(oneLine(fields.name))} directly.</p>
    </div>`;

  let res: Response;
  try {
    res = await fetch(config.endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: config.from, to: [config.to], reply_to: fields.email, subject, text, html }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    throw new DeliveryError(`Email provider unreachable: ${(err as Error).message}`);
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new DeliveryError(`Email provider responded ${res.status}: ${detail.slice(0, 300)}`);
  }
}
