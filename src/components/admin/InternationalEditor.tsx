"use client";

import { useState } from "react";
import { api, waitUntilLive } from "./client";
import s from "./admin.module.css";
import t from "./international.module.css";

export interface IntlPlayer {
  slug: string;
  name: string;
  photo?: string;
  district?: string;
  draft: boolean;
  topSeven: boolean;
  card?: "state" | "national" | "international";
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/**
 * Choose the International players section: who is in it and in what order
 * (the same order as on the website). Drag a card, or use the arrows, to
 * reorder.
 */
export function InternationalEditor({ initial, players }: { initial: string[]; players: IntlPlayer[] }) {
  const [list, setList] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState<string>();
  const [msg, setMsg] = useState<{ tone: "ok" | "err" | "info"; text: React.ReactNode }>();
  const bySlug = new Map(players.map((p) => [p.slug, p]));
  const changed = list.length !== saved.length || list.some((slug, i) => saved[i] !== slug);
  const others = players.filter((p) => !p.draft && !list.includes(p.slug));
  const intlCards = others.filter((p) => p.card === "international");

  const update = (next: string[]) => (setList(next), setMsg(undefined));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= list.length || from === to) return;
    const next = [...list];
    next.splice(to, 0, next.splice(from, 1)[0]);
    update(next);
  };

  async function publish() {
    setBusy(true);
    setMsg({ tone: "info", text: "Publishing…" });
    const r = await api("PUT", "/api/admin/international", { players: list });
    setBusy(false);
    if (!r.ok) return setMsg({ tone: "err", text: r.message ?? "Could not save the list." });
    setSaved(list);
    const commit = r.commit as string;
    const view = (
      <a href="/players#international-title" target="_blank" rel="noreferrer">
        View it ↗
      </a>
    );
    if (commit === "local") return setMsg({ tone: "ok", text: <>Published (local preview). {view}</> });
    setMsg({ tone: "info", text: "Published! The website is updating — this usually takes 1–2 minutes…" });
    const live = await waitUntilLive(commit, (sec) => setMsg({ tone: "info", text: `Published! The website is updating… (${sec}s)` }));
    setMsg({ tone: "ok", text: live ? <>The International players are live. {view}</> : <>Published. The website should update within a few minutes. {view}</> });
  }

  return (
    <div className={s.form}>
      <section className={t.block}>
        <header className={t.head}>
          <h2 className={t.title}>
            In the section <span className={t.count}>{list.length}</span>
          </h2>
          <p className={s.help}>Drag a card or use the arrows to change the order. Two cards sit side by side on phones.</p>
        </header>
        {list.length === 0 ? (
          <div className={s.empty}>No players yet: add them below. Until then the website shows “coming soon” cards.</div>
        ) : (
          <ol className={t.grid}>
            {list.map((slug, i) => {
              const p = bySlug.get(slug);
              if (!p) return null;
              return (
                <li
                  key={slug}
                  className={t.tile}
                  draggable
                  data-dragging={drag === slug || undefined}
                  data-changed={saved[i] !== slug || undefined}
                  onDragStart={(e) => (setDrag(slug), e.dataTransfer.setData("text/plain", slug), (e.dataTransfer.effectAllowed = "move"))}
                  onDragEnd={() => setDrag(undefined)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (drag && drag !== slug) move(list.indexOf(drag), i);
                  }}
                  onDrop={(e) => e.preventDefault()}
                >
                  <span className={t.num}>{i + 1}</span>
                  <div className={t.photo}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.photo ? <img src={p.photo} alt="" draggable={false} /> : <span>{initials(p.name)}</span>}
                  </div>
                  <b className={t.name}>{p.name}</b>
                  <span className={t.tags}>
                    {p.topSeven && <span className={s.pill}>Top 7</span>}
                    {p.card !== "international" && <span className={`${s.pill} ${s.pillWarn}`} title="This player's card is not the International design (change it in their profile).">{p.card === "national" ? "National card" : "State card"}</span>}
                  </span>
                  <span className={t.actions}>
                    <button type="button" className={`${s.btn} ${s.small}`} onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Move ${p.name} earlier`}>
                      ←
                    </button>
                    <button type="button" className={`${s.btn} ${s.small}`} onClick={() => move(i, i + 1)} disabled={i === list.length - 1} aria-label={`Move ${p.name} later`}>
                      →
                    </button>
                    <button type="button" className={`${s.btn} ${s.small}`} onClick={() => update(list.filter((x) => x !== slug))} aria-label={`Remove ${p.name}`}>
                      Remove
                    </button>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section className={t.block}>
        <header className={t.head}>
          <h2 className={t.title}>Add players</h2>
          {intlCards.length > 1 && (
            <button type="button" className={`${s.btn} ${s.small}`} onClick={() => update([...list, ...intlCards.map((p) => p.slug)])}>
              + Add all {intlCards.length} with an International card
            </button>
          )}
        </header>
        {others.length === 0 ? (
          <p className={s.help}>Every published player is already in the section.</p>
        ) : (
          <ul className={t.pick}>
            {others.map((p) => (
              <li key={p.slug}>
                <button type="button" className={t.chip} onClick={() => update([...list, p.slug])} data-intl={p.card === "international" || undefined}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.photo ? <img src={p.photo} alt="" /> : <span>{initials(p.name)}</span>}
                  {p.name}
                  <i aria-hidden="true">+</i>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className={s.help}>
          Highlighted players already have the International card. Only published players are listed{players.some((p) => p.draft) ? " (drafts are hidden)" : ""}. The cards on the website show each player&apos;s photo, medals and
          international results from their profile.
        </p>
      </section>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" className={`${s.btn} ${s.primary}`} disabled={busy || !changed} onClick={publish}>
          {busy ? "Publishing…" : "Publish International players"}
        </button>
        {changed && (
          <button type="button" className={s.btn} disabled={busy} onClick={() => update(saved)}>
            Undo changes
          </button>
        )}
        {msg && <span className={`${s.help} ${msg.tone === "err" ? s.err : msg.tone === "ok" ? s.ok : ""}`}>{msg.text}</span>}
      </div>
    </div>
  );
}
