"use client";

import { useEffect, useRef, useState } from "react";
import s from "./admin.module.css";

/**
 * Asks for the lock password to lock or unlock a position. `onSubmit`
 * returns an error message, or nothing when it worked.
 */
export function LockDialog({ open, title, text, onClose, onSubmit }: { open: boolean; title: string; text: string; onClose: () => void; onSubmit: (password: string) => Promise<string | void> }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setPw("");
      setErr("");
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const error = await onSubmit(pw);
    setBusy(false);
    if (error) setErr(error);
  }

  return (
    <dialog ref={ref} className={s.dialog} onClose={onClose} aria-labelledby="lock-title">
      <form onSubmit={submit}>
        <h2 id="lock-title" className={s.sectionTitle}>
          {title}
        </h2>
        <p className={s.lede}>{text}</p>
        <input className={s.input} style={{ marginTop: 16 }} type="password" autoComplete="off" placeholder="Lock password" value={pw} onChange={(e) => setPw(e.target.value)} aria-label="Lock password" autoFocus />
        {err && <p className={`${s.help} ${s.err}`} style={{ marginTop: 10 }}>{err}</p>}
        <div className={s.dialogActions}>
          <button type="button" className={s.btn} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className={`${s.btn} ${s.primary}`} disabled={busy || !pw}>
            {busy ? "Checking…" : "Confirm"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
