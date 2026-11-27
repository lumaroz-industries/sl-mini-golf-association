"use client";

import { useState } from "react";
import { api, waitUntilLive } from "./client";
import { LockDialog } from "./LockDialog";
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
 * Choose a level section (International, National or State players): who is in it and in what order
 * (the same order as on the website). Drag a card, or use the arrows, to
 * reorder. A player can be locked at their position with the lock password:
 * they then stay there while everyone else moves around them.
 */
const LABEL = { international: "International", national: "National", state: "State" } as const;

export function SectionEditor({ section, initial, players, pins: initialPins }: { section: "international" | "national" | "state"; initial: string[]; players: IntlPlayer[]; pins: Record<string, number> }) {
  const label = LABEL[section];
  const [list, setList] = useState(initial);
  const [pins, setPins] = useState(initialPins);
  const [lockFor, setLockFor] = useState<string>();
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState<string>();
  const [msg, setMsg] = useState<{ tone: "ok" | "err" | "info"; text: React.ReactNode }>();
  const bySlug = new Map(players.map((p) => [p.slug, p]));
  const changed = list.length !== saved.length || list.some((slug, i) => saved[i] !== slug);
  const others = players.filter((p) => !p.draft && !list.includes(p.slug));
  // Players whose card is this level's design (cards without a type are State cards).
  const intlCards = others.filter((p) => (p.card ?? "state") === section);

  const isPinned = (slug: string) => slug in pins;
  /** Puts every locked player back at their position; everyone else keeps their order around them. */
  const settle = (next: string[]) => {
    const free = next.filter((s) => !isPinned(s));
    // Locked players are always kept (they can't be removed), at their own position.
    const locked = Object.entries(pins).filter(([s]) => next.includes(s) || list.includes(s));
    const at = new Map(locked.map(([s, p]) => [p - 1, s]));
    const out: string[] = [];
    const total = free.length + locked.length;
    for (let i = 0; i < total; i++) out.push(at.get(i) ?? free.shift()!);
    return out.filter(Boolean);
  };
  const update = (next: string[]) => (setList(settle(next)), setMsg(undefined));
  /** Moves a player one place (or onto a dragged-over place), stepping over locked players. */
  const move = (from: number, to: number) => {
    if (to < 0 || to >= list.length || from === to || isPinned(list[from]) || isPinned(list[to])) return;
    const free = list.filter((s) => !isPinned(s));
    const a = free.indexOf(list[from]);
    const b = free.indexOf(list[to]);
    free.splice(b, 0, free.splice(a, 1)[0]);
    update(free);
  };
  /** The next unlocked place in a direction, for the arrow buttons. */
  const nextFree = (i: number, dir: -1 | 1) => {
    let j = i + dir;
    while (j >= 0 && j < list.length && isPinned(list[j])) j += dir;
    return j;
  };

  async function toggleLock(password: string) {
    const slug = lockFor!;
    const r = await api("PUT", "/api/admin/locks", { section, key: slug, locked: !isPinned(slug), password });
    if (!r.ok) return r.message ?? "Could not change the lock.";
    setPins((r.pins as Record<string, Record<string, number>>)[section]);
    setLockFor(undefined);
    const commit = r.commit as string;
    setMsg({ tone: "ok", text: commit === "local" ? "Lock saved (local preview)." : "Lock saved." });
  }

  async function publish() {
    setBusy(true);
    setMsg({ tone: "info", text: "Publishing…" });
    const r = await api("PUT", `/api/admin/sections/${section}`, { players: list });
    setBusy(false);
    if (!r.ok) return setMsg({ tone: "err", text: r.message ?? "Could not save the list." });
    setSaved(list);
    const commit = r.commit as string;
    const view = (
      <a href={`/players#${section}`} target="_blank" rel="noreferrer">
        View it ↗
      </a>
    );
    if (commit === "local") return setMsg({ tone: "ok", text: <>Published (local preview). {view}</> });
    setMsg({ tone: "info", text: "Published! The website is updating — this usually takes 1–2 minutes…" });
    const live = await waitUntilLive(commit, (sec) => setMsg({ tone: "info", text: `Published! The website is updating… (${sec}s)` }));
    setMsg({ tone: "ok", text: live ? <>The {label} players are live. {view}</> : <>Published. The website should update within a few minutes. {view}</> });
  }

  return (
    <div className={s.form}>
      <section className={t.block}>
        <header className={t.head}>
          <h2 className={t.title}>
            In the section <span className={t.count}>{list.length}</span>
          </h2>
          <p className={s.help}>Drag a card or use the arrows to change the order. 🔓 locks a player at their position (lock password needed); locked players stay put while the others move around them.</p>
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
                  draggable={!isPinned(slug)}
                  data-pinned={isPinned(slug) || undefined}
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
                    {isPinned(slug) && <span className={`${s.pill} ${t.lockPill}`}>🔒 Locked at {pins[slug]}</span>}
                    {p.topSeven && <span className={s.pill}>Top 7</span>}
                    {(p.card ?? "state") !== section && <span className={`${s.pill} ${s.pillWarn}`} title={`This player's card is not the ${label} design (change it in their profile).`}>{p.card === "national" ? "National card" : p.card === "international" ? "International card" : "State card"}</span>}
                  </span>
                  <span className={t.actions}>
                    <button type="button" className={`${s.btn} ${s.small}`} onClick={() => move(i, nextFree(i, -1))} disabled={isPinned(slug) || nextFree(i, -1) < 0} aria-label={`Move ${p.name} earlier`}>
                      ←
                    </button>
                    <button type="button" className={`${s.btn} ${s.small}`} onClick={() => move(i, nextFree(i, 1))} disabled={isPinned(slug) || nextFree(i, 1) >= list.length} aria-label={`Move ${p.name} later`}>
                      →
                    </button>
                    <button
                      type="button"
                      className={`${s.btn} ${s.small}`}
                      onClick={() => setLockFor(slug)}
                      disabled={!isPinned(slug) && (changed || saved[i] !== slug)}
                      title={isPinned(slug) ? "Unlock this position (lock password)" : changed ? "Publish your changes first, then lock" : "Lock this player at this position (lock password)"}
                      aria-label={isPinned(slug) ? `Unlock ${p.name}'s position` : `Lock ${p.name} at position ${i + 1}`}
                    >
                      {isPinned(slug) ? "🔒" : "🔓"}
                    </button>
                    <button type="button" className={`${s.btn} ${s.small}`} onClick={() => update(list.filter((x) => x !== slug))} disabled={isPinned(slug)} aria-label={`Remove ${p.name}`}>
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
              + Add all {intlCards.length} with a{section === "international" ? "n" : ""} {label} card
            </button>
          )}
        </header>
        {others.length === 0 ? (
          <p className={s.help}>Every published player is already in the section.</p>
        ) : (
          <ul className={t.pick}>
            {others.map((p) => (
              <li key={p.slug}>
                <button type="button" className={t.chip} onClick={() => update([...list, p.slug])} data-intl={(p.card ?? "state") === section || undefined}>
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
          Highlighted players already have the {label} card. Only published players are listed{players.some((p) => p.draft) ? " (drafts are hidden)" : ""}. The cards on the website show each player&apos;s photo, medals and
          {section} results from their profile.
        </p>
      </section>

      <LockDialog
        open={!!lockFor}
        title={lockFor && isPinned(lockFor) ? "Unlock this position?" : "Lock this position?"}
        text={
          lockFor
            ? isPinned(lockFor)
              ? `${bySlug.get(lockFor)?.name} can then be moved or removed again.`
              : `${bySlug.get(lockFor)?.name} will stay at position ${list.indexOf(lockFor) + 1}. Nobody can move or remove them without the lock password.`
            : ""
        }
        onClose={() => setLockFor(undefined)}
        onSubmit={toggleLock}
      />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" className={`${s.btn} ${s.primary}`} disabled={busy || !changed} onClick={publish}>
          {busy ? "Publishing…" : `Publish ${label} players`}
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
