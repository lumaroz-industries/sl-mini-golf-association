"use client";

import { useEffect, useState } from "react";
import c from "./credits.module.css";

/** "Good morning / afternoon / evening" in the visitor's own time. */
export function Greeting({ dev }: { dev: { name: string; url?: string } }) {
  const [part, setPart] = useState("Welcome back");
  useEffect(() => {
    const h = new Date().getHours();
    setPart(h < 5 ? "Working late" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
  }, []);
  return (
    <div>
      <p className={c.greet}>
        {part} <span aria-hidden="true">👋</span>
      </p>
      <p className={c.greetSub}>
        Your admin panel, built by{" "}
        {dev.url ? (
          <a href={dev.url} target="_blank" rel="noopener noreferrer">
            {dev.name}
          </a>
        ) : (
          dev.name
        )}
        .
      </p>
    </div>
  );
}
