"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./client";
import s from "./admin.module.css";

export function DeleteButton({ collection, slug, title, after }: { collection: "updates" | "articles" | "gallery" | "players"; slug: string; title: string; after?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const what = collection === "updates" ? "update" : collection === "articles" ? "article" : collection === "players" ? "player" : "album and all its photos";

  async function remove() {
    setBusy(true);
    setError("");
    const r = await api("DELETE", `/api/admin/content/${collection}/${slug}`);
    setBusy(false);
    if (!r.ok) return setError(r.message ?? "Could not delete.");
    ref.current?.close();
    if (after) router.push(after);
    router.refresh();
  }

  return (
    <>
      <button type="button" className={`${s.btn} ${s.small} ${s.danger}`} onClick={() => ref.current?.showModal()}>
        Delete
      </button>
      <dialog ref={ref} className={s.dialog} aria-labelledby={`del-${slug}`}>
        <h2 id={`del-${slug}`} className={s.sectionTitle}>
          Delete this {what}?
        </h2>
        <p className={s.lede}>
          “{title}” will be removed from the website within a couple of minutes. This can’t be undone here.
        </p>
        {error && <p className={s.err}>{error}</p>}
        <div className={s.dialogActions}>
          <button type="button" className={s.btn} onClick={() => ref.current?.close()} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={`${s.btn} ${s.danger}`} onClick={remove} disabled={busy}>
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </dialog>
    </>
  );
}
