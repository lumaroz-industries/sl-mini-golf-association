"use server";

import { isSignedIn } from "@/lib/admin/auth";
import { renderMarkdown } from "@/lib/markdown/render";
import prose from "@/styles/prose.module.css";

/** Renders the text exactly as the website will (same Markdown rules and styles). */
export async function previewMarkdown(markdown: string) {
  if (!(await isSignedIn())) return <p>Your session has ended — please sign in again.</p>;
  if (!markdown.trim()) return <p style={{ color: "var(--fg-muted)" }}>Nothing written yet.</p>;
  const { content } = await renderMarkdown(markdown.slice(0, 200_000));
  return <div className={prose.prose}>{content}</div>;
}
