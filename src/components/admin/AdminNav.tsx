"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "./client";
import s from "./admin.module.css";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/updates", label: "Updates" },
  { href: "/admin/articles", label: "Articles" },
  { href: "/admin/gallery", label: "Gallery" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <header className={s.bar}>
      <Link href="/admin" className={s.brand}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/slmga-icon-dark.svg" alt="SL" />
        <span>Admin</span>
      </Link>
      <nav className={s.nav} aria-label="Admin">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} aria-current={(l.href === "/admin" ? path === l.href : path.startsWith(l.href)) ? "page" : undefined}>
            {l.label}
          </Link>
        ))}
      </nav>
      <div className={s.barEnd}>
        <a href="/" target="_blank" rel="noreferrer" className={`${s.btn} ${s.small}`}>
          View site ↗
        </a>
        <button
          type="button"
          className={`${s.btn} ${s.small}`}
          onClick={async () => {
            await api("DELETE", "/api/admin/session");
            window.location.href = "/admin/login";
          }}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
