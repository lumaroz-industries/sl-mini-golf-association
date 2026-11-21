import { z } from "zod";

/**
 * Contact form contract — shared by the browser (instant feedback) and the
 * API route (the source of truth). Messages are written for people, not
 * developers, because they are shown next to the fields.
 */
export const LIMITS = {
  name: { min: 2, max: 100 },
  subject: { min: 3, max: 150 },
  message: { min: 10, max: 5000 },
  email: { max: 254 },
} as const;

/** A human needs at least this long to fill in the form. */
export const MIN_FILL_MS = 3000;

export const ContactFields = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Please enter your full name.")
    .min(LIMITS.name.min, "Your name looks too short.")
    .max(LIMITS.name.max, `Please keep your name under ${LIMITS.name.max} characters.`),
  email: z
    .string()
    .trim()
    .min(1, "Please enter your email address.")
    .max(LIMITS.email.max, "That email address is too long.")
    .pipe(z.email("Please enter a valid email address, like name@example.com.")),
  subject: z
    .string()
    .trim()
    .min(1, "Please add a subject.")
    .min(LIMITS.subject.min, "Your subject looks too short.")
    .max(LIMITS.subject.max, `Please keep the subject under ${LIMITS.subject.max} characters.`),
  message: z
    .string()
    .trim()
    .min(1, "Please write your message.")
    .min(LIMITS.message.min, `Please write at least ${LIMITS.message.min} characters.`)
    .max(LIMITS.message.max, `Please keep your message under ${LIMITS.message.max} characters.`),
});
export type ContactFields = z.infer<typeof ContactFields>;
export type ContactField = keyof ContactFields;

/** What the browser sends: the fields plus spam signals. */
export const ContactSubmission = ContactFields.extend({
  /** Honeypot — hidden from people, often filled in by bots. Must stay empty. */
  website: z.string().max(0).optional().default(""),
  /** When the form was first shown (ms since epoch). */
  startedAt: z.number().int().positive(),
});
export type ContactSubmission = z.infer<typeof ContactSubmission>;

export type FieldErrors = Partial<Record<ContactField, string>>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as ContactField;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export type ContactResponse =
  | { ok: true }
  | { ok: false; error: "validation"; fields: FieldErrors }
  | { ok: false; error: "unavailable" | "rate_limited" | "rejected" | "delivery_failed" | "bad_request"; message: string };
