"use client";

import { useState } from "react";
import { api, waitUntilLive } from "./client";
import s from "./admin.module.css";
import t from "./topSeven.module.css";

type Slot = "left-3" | "left-2" | "left-1" | "center" | "right-1" | "right-2" | "right-3";
const SLOTS: Array<{ key: Slot; label: string }> = [
  { key: "left-3", label: "Left · outer" },
  { key: "left-2", label: "Left · middle" },
  { key: "left-1", label: "Left · inner" },
  { key: "center", label: "Centre" },
  { key: "right-1", label: "Right · inner" },
  { key: "right-2", label: "Right · middle" },
  { key: "right-3", label: "Right · outer" },
];

export interface TopSevenPlayer {
  slug: string;
  name: string;
  photo?: string;
  district?: string;
  draft: boolean;
}

/**
 * Choose Maharashtra's Top 7: the seven places of the line-up on the Players
 * page, in the same order as on the website. Every other player stays in the
 * directory below it. Picking someone who is already in another place swaps
 * the two.
 */
export function TopSevenEditor({ initial, players }: { initial: Record<Slot, string | null>; players: TopSevenPlayer[] }) {
  const [lineup, setLineup] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err" | "info"; text: React.ReactNode }>();
  const bySlug = new Map(players.map((p) => [p.slug, p]));
  const published = players.filter((p) => !p.draft);
  const changed = SLOTS.some(({ key }) => lineup[key] !== saved[key]);
  const inTop = new Set(Object.values(lineup).filter(Boolean));

  function pick(slot: Slot, slug: string | null) {
    setLineup((cur) => {
      const next = { ...cur };
      const from = slug ? SLOTS.find(({ key }) => cur[key] === slug && key !== slot)?.key : undefined;
      if (from) next[from] = cur[slot]; // swap places
      next[slot] = slug;
      return next;
    });
    setMsg(undefined);
  }

  async function publish() {
    setBusy(true);
    setMsg({ tone: "info", text: "Publishing the Top 7…" });
    const r = await api("PUT", "/api/admin/top-seven", { lineup });
    setBusy(false);
    if (!r.ok) return setMsg({ tone: "err", text: r.message ?? "Could not save the Top 7." });
    setSaved(lineup);
    const commit = r.commit as string;
    if (commit === "local") return setMsg({ tone: "ok", text: <>Published (local preview). <a href="/players" target="_blank" rel="noreferrer">View it ↗</a></> });
    setMsg({ tone: "info", text: "Published! The website is updating — this usually takes 1–2 minutes…" });
    const live = await waitUntilLive(commit, (sec) => setMsg({ tone: "info", text: `Published! The website is updating… (${sec}s)` }));
    setMsg({ tone: "ok", text: live ? <>The new Top 7 is live. <a href="/players" target="_blank" rel="noreferrer">View it ↗</a></> : <>Published. The website should update within a few minutes — <a href="/players" target="_blank" rel="noreferrer">check it ↗</a></> });
  }

  return (
    <div className={s.form}>
      <ol className={t.lineup}>
        {SLOTS.map(({ key, label }) => {
          const p = lineup[key] ? bySlug.get(lineup[key]!) : undefined;
          return (
            <li key={key} className={t.slot} data-center={key === "center" || undefined} data-empty={!p || undefined} data-changed={lineup[key] !== saved[key] || undefined}>
              <span className={t.where}>{label}</span>
              <div className={t.photo}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p?.photo ? <img src={p.photo} alt="" /> : <span className={t.reveal}>{p ? p.name.split(" ").map((w) => w[0]).join("") : "Reveal soon"}</span>}
              </div>
              <b className={t.name}>{p ? p.name : "Empty"}</b>
              <select className={s.input} aria-label={`${label} place`} value={lineup[key] ?? ""} onChange={(e) => pick(key, e.target.value || null)}>
                <option value="">— Empty (Reveal soon) —</option>
                {published.map((pl) => (
                  <option key={pl.slug} value={pl.slug}>
                    {pl.name}
                    {inTop.has(pl.slug) && lineup[key] !== pl.slug ? " (swap)" : ""}
                  </option>
                ))}
              </select>
            </li>
          );
        })}
      </ol>

      <p className={s.help}>
        The centre is the featured card. Choosing a player who is already in another place swaps the two. Everyone not in the Top 7 still appears in the player directory below it. Only published players can be chosen
        {players.some((p) => p.draft) ? " (drafts are hidden here)" : ""}.
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" className={`${s.btn} ${s.primary}`} disabled={busy || !changed} onClick={publish}>
          {busy ? "Publishing…" : "Publish Top 7"}
        </button>
        {changed && (
          <button type="button" className={s.btn} disabled={busy} onClick={() => (setLineup(saved), setMsg(undefined))}>
            Undo changes
          </button>
        )}
        {msg && <span className={`${s.help} ${msg.tone === "err" ? s.err : msg.tone === "ok" ? s.ok : ""}`}>{msg.text}</span>}
      </div>
    </div>
  );
}
