import "server-only";
import { getSiteSettings } from "@/content/repository";
import type { ContactFields } from "./schema";

/**
 * Email delivery for the contact form, via Resend's HTTP API (free tier).
 *
 * Delivery is ON when RESEND_API_KEY is set and there is a recipient:
 * CONTACT_TO_EMAIL, or else the official email published in site content.
 * While it is off, the page shows the form as unavailable and the API
 * refuses submissions — the site never pretends a message was sent.
 */
interface DeliveryConfig {
  apiKey: string;
  to: string;
  from: string;
  endpoint: string;
}

export interface DeliveryStatus {
  configured: boolean;
  hasApiKey: boolean;
  recipientSource: "CONTACT_TO_EMAIL" | "site content" | "missing";
}

async function recipient(): Promise<{ to?: string; source: DeliveryStatus["recipientSource"] }> {
  const fromEnv = process.env.CONTACT_TO_EMAIL?.trim();
  if (fromEnv) return { to: fromEnv, source: "CONTACT_TO_EMAIL" };
  const { contact } = await getSiteSettings();
  return contact.email ? { to: contact.email, source: "site content" } : { source: "missing" };
}

/** Non-secret summary of the setup, for the status check. */
export async function getDeliveryStatus(): Promise<DeliveryStatus> {
  const hasApiKey = Boolean(process.env.RESEND_API_KEY?.trim());
  const { source } = await recipient();
  return { configured: hasApiKey && source !== "missing", hasApiKey, recipientSource: source };
}

export async function getDeliveryConfig(): Promise<DeliveryConfig | null> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const { to } = await recipient();
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

export async function isContactDeliveryConfigured(): Promise<boolean> {
  return (await getDeliveryConfig()) !== null;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();

export class DeliveryError extends Error {}

export async function deliverContactMessage(fields: ContactFields): Promise<void> {
  const config = await getDeliveryConfig();
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
    const hint =
      res.status === 401 || res.status === 400
        ? " — check that RESEND_API_KEY is copied exactly (it starts with re_)."
        : res.status === 403
          ? " — without a verified domain, Resend only delivers to the email address that owns the Resend account."
          : "";
    throw new DeliveryError(`Email provider responded ${res.status}${hint} ${detail.slice(0, 300)}`);
  }
}
