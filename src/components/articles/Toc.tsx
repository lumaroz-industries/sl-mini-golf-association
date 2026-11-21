"use client";

import { useEffect, useState } from "react";
import type { TocItem } from "@/lib/markdown/render";
import styles from "./Articles.module.css";

/** Contents list that highlights the section being read. */
export function Toc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState(items[0]?.id);
  // Open beside the text on wide screens; collapsed above it on smaller ones.
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setOpen(window.matchMedia("(min-width: 1181px)").matches);
  }, []);

  useEffect(() => {
    const heads = items.map((i) => document.getElementById(i.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id);
      },
      { rootMargin: "-15% 0px -70% 0px" },
    );
    heads.forEach((h) => io.observe(h));
    return () => io.disconnect();
  }, [items]);

  return (
    <details className={styles.toc} open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className={styles.tocTitle}>In this article</summary>
      <ol>
        {items.map((i) => (
          <li key={i.id} data-level={i.level}>
            <a href={`#${i.id}`} aria-current={active === i.id ? "location" : undefined}>
              {i.text}
            </a>
          </li>
        ))}
      </ol>
    </details>
  );
}
