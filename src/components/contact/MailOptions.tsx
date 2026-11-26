"use client";

import { useState } from "react";
import s from "./MailOptions.module.css";

/**
 * Ways to write the email besides Gmail. A "mailto:" link alone does nothing
 * on computers without a default mail app (common on Windows), so this also
 * offers Copy, Outlook and Yahoo Mail on the web — and the mail app last.
 */
export function MailOptions({ email, subject = "", body = "", lead }: { email: string; subject?: string; body?: string; lead?: string }) {
  const [copied, setCopied] = useState(false);
  const q = (k: string, v: string) => (v ? `&${k}=${encodeURIComponent(v)}` : "");
  const to = encodeURIComponent(email);
  const outlook = `https://outlook.live.com/mail/0/deeplink/compose?to=${to}${q("subject", subject)}${q("body", body)}`;
  const yahoo = `https://compose.mail.yahoo.com/?to=${to}${q("subject", subject)}${q("body", body)}`;
  const mailto = `mailto:${email}${subject || body ? `?${[subject && `subject=${encodeURIComponent(subject)}`, body && `body=${encodeURIComponent(body)}`].filter(Boolean).join("&")}` : ""}`;

  async function copy() {
    const text = body ? `To: ${email}\nSubject: ${subject}\n\n${body}` : email;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const t = document.createElement("textarea");
      t.value = text;
      document.body.append(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <span className={s.row}>
      {lead && <span className={s.lead}>{lead}</span>}
      <button type="button" className={s.chip} onClick={copy}>
        {copied ? "Copied ✓" : body ? "Copy message" : "Copy email"}
      </button>
      <a className={s.chip} href={outlook} target="_blank" rel="noopener noreferrer">
        Outlook
      </a>
      <a className={s.chip} href={yahoo} target="_blank" rel="noopener noreferrer">
        Yahoo Mail
      </a>
      <a className={s.chip} href={mailto}>
        Mail app
      </a>
    </span>
  );
}
