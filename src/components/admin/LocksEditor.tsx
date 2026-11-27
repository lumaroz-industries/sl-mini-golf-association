"use client";

import { useState } from "react";
import { api, waitUntilLive } from "./client";
import s from "./admin.module.css";

/** Turn section locks on or off — saving needs the lock password. */
export function LocksEditor({ sections, initial }: { sections: Array<{ id: string; label: string }>; initial: string[] }) {
  const [locked, setLocked] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err" | "info"; text: string }>();
  const changed = sections.some((x) => locked.includes(x.id) !== saved.includes(x.id));

  async function save() {
    setBusy(true);
    setMsg({ tone: "info", text: "Saving the locks…" });
    const r = await api("PUT", "/api/admin/locks", { locked, password: pw });
    setBusy(false);
    if (!r.ok) return setMsg({ tone: "err", text: r.message ?? "Could not save." });
    setSaved(locked);
    setPw("");
    const commit = r.commit as string;
    if (commit === "local") return setMsg({ tone: "ok", text: "Locks saved (local preview)." });
    setMsg({ tone: "info", text: "Saved! Updating…" });
    const live = await waitUntilLive(commit, (sec) => setMsg({ tone: "info", text: `Saved! Updating… (${sec}s)` }));
    setMsg({ tone: "ok", text: live ? "The locks are in place." : "Saved. They take effect within a few minutes." });
  }

  return (
    <div className={s.form}>
      <section className={s.section}>
        <ul className={s.list}>
          {sections.map((x) => {
            const on = locked.includes(x.id);
            return (
              <li key={x.id} className={s.row}>
                <div className={s.rowMain}>
                  <span className={s.rowTitle}>
                    {on ? "🔒" : "🔓"} {x.label}
                  </span>
                  <div className={s.rowMeta}>
                    <span className={`${s.pill} ${on ? s.pillDraft : s.pillLive}`}>{on ? "Locked" : "Open"}</span>
                    {saved.includes(x.id) !== on && <span>Not saved yet</span>}
                  </div>
                </div>
                <div className={s.rowActions}>
                  <button type="button" className={`${s.btn} ${s.small} ${on ? "" : s.primary}`} onClick={() => (setLocked((l) => (on ? l.filter((i) => i !== x.id) : [...l, x.id])), setMsg(undefined))}>
                    {on ? "Unlock" : "Lock"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input className={s.input} style={{ maxWidth: 280 }} type="password" autoComplete="off" placeholder="Lock password" value={pw} onChange={(e) => setPw(e.target.value)} aria-label="Lock password" />
        <button type="button" className={`${s.btn} ${s.primary}`} disabled={busy || !changed || !pw} onClick={save}>
          {busy ? "Saving…" : "Save locks"}
        </button>
        {changed && (
          <button type="button" className={s.btn} disabled={busy} onClick={() => (setLocked(saved), setMsg(undefined))}>
            Undo
          </button>
        )}
      </div>
      {msg && <p className={`${s.help} ${msg.tone === "err" ? s.err : msg.tone === "ok" ? s.ok : ""}`}>{msg.text}</p>}
    </div>
  );
}
