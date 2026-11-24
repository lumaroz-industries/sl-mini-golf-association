"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./client";
import s from "./admin.module.css";

export function LoginForm({ expired }: { expired: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(expired ? "Your session ended — please sign in again." : "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await api("POST", "/api/admin/session", { password });
    setBusy(false);
    if (!r.ok) return setError(r.message ?? "Could not sign in.");
    // Move on without a full reload, so the opening animation doesn't play twice.
    router.replace("/admin");
    router.refresh();
  }

  return (
    <form className={s.form} onSubmit={submit}>
      <div className={s.field}>
        <label className={s.label} htmlFor="pw">
          Password
        </label>
        <input id="pw" className={s.input} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
      </div>
      {error && <p className={`${s.help} ${s.err}`} role="alert">{error}</p>}
      <button className={`${s.btn} ${s.primary}`} disabled={busy || !password}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
