"use client";

import { useEffect, useRef } from "react";

interface RevealProps extends React.HTMLAttributes<HTMLElement> {
  as?: "div" | "section" | "article" | "li" | "header";
  /** Stagger index for children-based delays (exposed as --i). */
  index?: number;
}

/**
 * Adds `data-visible` when the element scrolls into view, so CSS can animate
 * it in. Content is fully visible without JavaScript and with reduced motion.
 */
export function Reveal({ as: Tag = "div", index, style, children, ...rest }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.setAttribute("data-reveal", "");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.setAttribute("data-visible", "");
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.setAttribute("data-visible", "");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      data-reveal-target=""
      style={index === undefined ? style : ({ ...style, "--i": index } as React.CSSProperties)}
      {...rest}
    >
      {children}
    </Tag>
  );
}
