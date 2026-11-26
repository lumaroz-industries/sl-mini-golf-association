"use client";

import Link from "next/link";
import { useState } from "react";
import { api, waitUntilLive } from "./client";
import { DeleteButton } from "./DeleteButton";
import s from "./admin.module.css";

export interface OfficialRow {
  id: string;
  name: string;
  role: string;
  level: string;
  photo?: string;
  draft: boolean;
}

const initials = (name: string) => {
  const w = name.split(/\s+/).filter((x) => !/^(dr|mr|mrs|ms|shri|smt)\.?$/i.test(x));
  return ((w[0]?.[0] ?? "") + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase();
};

/** The officials by level, in the order shown on the website; move them up or down and save the order. */
export function OfficialsList({ levels, initial }: { levels: Array<{ id: string; title: string; subtitle: string }>; initial: OfficialRow[] }) {
  const [list, setList] = useState(initial);
  const [saved, setSaved] = useState(initial.map((o) => o.id));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err" | "info"; text: React.ReactNode }>();
  const changed = list.some((o, i) => o.id !== saved[i]);

  function move(id: string, dir: -1 | 1) {
    setList((cur) => {
      const i = cur.findIndex((o) => o.id === id);
      // Swap with the nearest official on the same level.
      let j = i + dir;
      while (j >= 0 && j < cur.length && cur[j].level !== cur[i].level) j += dir;
      if (j < 0 || j >= cur.length) return cur;
      const next = [...cur];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setMsg(undefined);
  }

  async function saveOrder() {
    setBusy(true);
    setMsg({ tone: "info", text: "Saving the order…" });
    const r = await api("PUT", "/api/admin/content/officials", { order: list.map((o) => o.id) });
    setBusy(false);
    if (!r.ok) return setMsg({ tone: "err", text: r.message ?? "Could not save the order." });
    setSaved(list.map((o) => o.id));
    const commit = r.commit as string;
    if (commit === "local") return setMsg({ tone: "ok", text: "Order saved (local preview)." });
    setMsg({ tone: "info", text: "Saved! The website is updating…" });
    const live = await waitUntilLive(commit, (sec) => setMsg({ tone: "info", text: `Saved! The website is updating… (${sec}s)` }));
    setMsg({ tone: "ok", text: live ? "The new order is live." : "Saved. The website should update within a few minutes." });
  }

  return (
    <div className={s.form}>
      {levels.map((lv) => {
        const rows = list.filter((o) => o.level === lv.id);
        return (
          <section key={lv.id} className={s.section}>
            <div className={s.sectionHead}>
              <h2 className={s.sectionTitle}>
                {lv.title} · {lv.subtitle} ({rows.length})
              </h2>
            </div>
            {rows.length === 0 ? (
              <div className={s.empty}>No officials yet. The website shows “To be announced” cards here.</div>
            ) : (
              <ul className={s.list}>
                {rows.map((o, k) => (
                  <li key={o.id} className={s.row}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {o.photo ? <img className={s.rowThumb} src={o.photo} alt="" style={{ width: 48, height: 60 }} /> : <span className={s.rowThumb} style={{ width: 48, height: 60, display: "grid", placeItems: "center", fontWeight: 700, color: "var(--gold)" }}>{initials(o.name)}</span>}
                    <div className={s.rowMain}>
                      <Link href={`/admin/officials/${o.id}`} className={s.rowTitle}>
                        {o.name}
                      </Link>
                      <div className={s.rowMeta}>
                        <span className={`${s.pill} ${o.draft ? s.pillDraft : s.pillLive}`}>{o.draft ? "Draft" : "Live"}</span>
                        <span>{o.role}</span>
                      </div>
                    </div>
                    <div className={s.rowActions}>
                      <button type="button" className={`${s.btn} ${s.small}`} onClick={() => move(o.id, -1)} disabled={k === 0} aria-label={`Move ${o.name} up`}>
                        ↑
                      </button>
                      <button type="button" className={`${s.btn} ${s.small}`} onClick={() => move(o.id, 1)} disabled={k === rows.length - 1} aria-label={`Move ${o.name} down`}>
                        ↓
                      </button>
                      <Link href={`/admin/officials/${o.id}`} className={`${s.btn} ${s.small}`}>
                        Edit
                      </Link>
                      <DeleteButton collection="officials" slug={o.id} title={o.name} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
      {changed && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" className={`${s.btn} ${s.primary}`} disabled={busy} onClick={saveOrder}>
            {busy ? "Saving…" : "Save the order"}
          </button>
          <button type="button" className={s.btn} disabled={busy} onClick={() => setList(saved.map((id) => list.find((o) => o.id === id)!))}>
            Undo
          </button>
        </div>
      )}
      {msg && <p className={`${s.help} ${msg.tone === "err" ? s.err : msg.tone === "ok" ? s.ok : ""}`}>{msg.text}</p>}
    </div>
  );
}
