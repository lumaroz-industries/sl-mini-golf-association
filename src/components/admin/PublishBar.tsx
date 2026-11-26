"use client";

import { useState } from "react";
import { api, waitUntilLive } from "./client";
import { Issues } from "./fields";
import s from "./admin.module.css";

/**
 * Save as draft / Publish, with clear feedback: what went wrong, or when the
 * change is live on the website.
 */
export function PublishBar({
  collection,
  build,
  isNew,
  wasDraft,
  publicPath,
  editPath,
  onSaved,
}: {
  collection: "updates" | "articles" | "gallery" | "players" | "officials";
  /** Returns the request body for the given draft state, or an error message. */
  build: (draft: boolean) => unknown | string;
  isNew: boolean;
  wasDraft: boolean;
  publicPath: (slug: string) => string;
  editPath: (slug: string) => string;
  /** Called after a successful save (the item now exists; drafts stay drafts). */
  onSaved: (slug: string, draft: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err" | "info"; text: React.ReactNode }>();
  const [issues, setIssues] = useState<string[]>();

  async function save(draft: boolean) {
    setIssues(undefined);
    const body = build(draft);
    if (typeof body === "string") return setMsg({ tone: "err", text: body });
    setBusy(true);
    setMsg({ tone: "info", text: draft ? "Saving draft…" : "Publishing…" });
    const r = await api("PUT", `/api/admin/content/${collection}`, body);
    setBusy(false);
    if (!r.ok) {
      setIssues(r.issues);
      return setMsg({ tone: "err", text: r.message ?? "Could not save." });
    }
    const slug = r.slug as string;
    const commit = r.commit as string;
    if (draft) setMsg({ tone: "ok", text: "Draft saved. It is not visible on the website." });
    else if (commit === "local") setMsg({ tone: "ok", text: <>Published (local preview). <a href={publicPath(slug)} target="_blank" rel="noreferrer">View it ↗</a></> });
    else {
      setMsg({ tone: "info", text: "Published! The website is updating — this usually takes 1–2 minutes…" });
      waitUntilLive(commit, (sec) => setMsg({ tone: "info", text: `Published! The website is updating… (${sec}s)` })).then((live) =>
        setMsg(
          live
            ? { tone: "ok", text: <>Live on the website. <a href={publicPath(slug)} target="_blank" rel="noreferrer">View it ↗</a></> }
            : { tone: "ok", text: <>Published. The website should update within a few minutes — <a href={publicPath(slug)} target="_blank" rel="noreferrer">check it ↗</a></> },
        ),
      );
    }
    // Stay on the page (keeping the message), but move to the item's own address.
    if (isNew) window.history.replaceState(null, "", editPath(slug));
    onSaved(slug, draft);
  }

  return (
    <>
      <Issues items={issues} />
      <div className={s.publish}>
        <p className={`${s.publishMsg} ${msg?.tone === "ok" ? s.ok : msg?.tone === "err" ? s.err : ""}`} role="status" aria-live="polite">
          {msg?.text ?? (isNew ? "Not published yet." : wasDraft ? "This is a draft — not visible on the website." : "Changes go live when you click Update.")}
        </p>
        <button type="button" className={s.btn} disabled={busy} onClick={() => save(true)}>
          {wasDraft || isNew ? "Save draft" : "Unpublish (make draft)"}
        </button>
        <button type="button" className={`${s.btn} ${s.primary}`} disabled={busy} onClick={() => save(false)}>
          {isNew || wasDraft ? "Publish" : "Update"}
        </button>
      </div>
    </>
  );
}
