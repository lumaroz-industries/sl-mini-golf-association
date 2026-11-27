"use client";

import { useState, useSyncExternalStore } from "react";
import { api, getLockPassword, setLockPassword } from "./client";
import s from "./admin.module.css";

const subscribe = () => () => {};

/**
 * Wraps a lockable admin page. When the section is locked, everything inside
 * is shown but can't be used until the lock password is entered (kept for
 * this tab only). The server checks the password again on every change.
 */
export function LockGate({ locked, label, children }: { locked: boolean; label: string; children: React.ReactNode }) {
  // Already unlocked earlier in this tab?
  const stored = useSyncExternalStore(subscribe, () => !!getLockPassword(), () => false);
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const unlocked = !locked || open || stored;

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = await api("POST", "/api/admin/locks", { password: pw });
    setBusy(false);
    if (!r.ok) return setErr(r.message ?? "Wrong lock password.");
    setLockPassword(pw);
    setPw("");
    setOpen(true);
  }

  if (!locked) return <>{children}</>;
  return (
    <>
      {unlocked ? (
        <div className={s.lockBar} data-open="">
          <span>
            <b>🔓 Unlocked</b> {label} is locked, but you entered the lock password (for this tab).
          </span>
          <button type="button" className={`${s.btn} ${s.small}`} onClick={() => (setLockPassword(undefined), setOpen(false), location.reload())}>
            Lock again
          </button>
        </div>
      ) : (
        <form className={s.lockBar} onSubmit={unlock}>
          <span>
            <b>🔒 Locked</b> {label} can&apos;t be changed without the lock password.
          </span>
          <span className={s.lockForm}>
            <input className={s.input} type="password" autoComplete="off" placeholder="Lock password" value={pw} onChange={(e) => setPw(e.target.value)} aria-label="Lock password" />
            <button type="submit" className={`${s.btn} ${s.primary}`} disabled={busy || !pw}>
              {busy ? "Checking…" : "Unlock"}
            </button>
          </span>
          {err && <span className={`${s.help} ${s.err}`}>{err}</span>}
        </form>
      )}
      <fieldset className={s.lockArea} disabled={!unlocked} data-locked={!unlocked || undefined}>
        {children}
      </fieldset>
    </>
  );
}
