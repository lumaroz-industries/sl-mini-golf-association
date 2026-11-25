"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { api } from "./client";
import s from "./admin.module.css";
import c from "./credits.module.css";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/updates", label: "Updates" },
  { href: "/admin/articles", label: "Articles" },
  { href: "/admin/gallery", label: "Gallery" },
  { href: "/admin/players", label: "Players" },
  { href: "/admin/photo-studio", label: "Photo Studio" },
  { href: "/admin/help", label: "Help" },
];

export function AdminNav({ signature }: { signature?: { name: string; url?: string } }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const signOut = async () => {
    await api("DELETE", "/api/admin/session");
    window.location.href = "/admin/login";
  };
  const isCurrent = (href: string) => (href === "/admin" ? path === href : path.startsWith(href));
  const current = LINKS.find((l) => isCurrent(l.href));

  // Close the phone menu on navigation and with Escape.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- reset on route change
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onTap = (e: PointerEvent) => !(e.target as Element).closest?.("[data-admin-menu]") && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onTap);
    return () => (window.removeEventListener("keydown", onKey), document.removeEventListener("pointerdown", onTap));
  }, [open]);

  return (
    <header className={s.bar}>
      <span>
        <Link href="/admin" className={s.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/slmga-icon-dark.svg" alt="SL" />
          <span>Admin</span>
        </Link>
        {signature && (
          <a className={c.signature} href={signature.url ?? "#"} target="_blank" rel="noopener noreferrer">
            Crafted by {signature.name} ◆
          </a>
        )}
      </span>
      <nav className={s.nav} aria-label="Admin">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} aria-current={isCurrent(l.href) ? "page" : undefined}>
            {l.label}
          </Link>
        ))}
      </nav>
      <button type="button" className={s.menuBtn} data-admin-menu aria-expanded={open} aria-controls="admin-menu" onClick={() => setOpen((v) => !v)}>
        <span className={s.menuIcon} aria-hidden="true" data-open={open || undefined}>
          <i />
          <i />
          <i />
        </span>
        {current?.label ?? "Menu"}
      </button>
      <nav id="admin-menu" className={s.menu} data-admin-menu data-open={open || undefined} aria-label="Admin menu" hidden={!open}>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} aria-current={isCurrent(l.href) ? "page" : undefined} onClick={() => setOpen(false)}>
            {l.label}
            {isCurrent(l.href) && <span aria-hidden="true">◆</span>}
          </Link>
        ))}
        <div className={s.menuEnd}>
          <a href="/" target="_blank" rel="noreferrer" className={`${s.btn} ${s.small}`}>
            View site ↗
          </a>
          <button type="button" className={`${s.btn} ${s.small}`} onClick={signOut}>
            Sign out
          </button>
        </div>
      </nav>
      <div className={s.barEnd}>
        <a href="/" target="_blank" rel="noreferrer" className={`${s.btn} ${s.small}`}>
          View site ↗
        </a>
        <button
          type="button"
          className={`${s.btn} ${s.small}`}
          onClick={signOut}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
