"use client";

import { useState } from "react";
import s from "./admin.module.css";

type Level = "all" | "international" | "national" | "state";
const LEVELS: Array<{ id: Level; label: string }> = [
  { id: "all", label: "All" },
  { id: "international", label: "International" },
  { id: "national", label: "National" },
  { id: "state", label: "State" },
];

/**
 * Filters the admin players list by card type. The rows are rendered on the
 * server; each carries data-level, and this only hides the ones that don't match.
 */
export function PlayersFilter({ counts, children }: { counts: Record<Level, number>; children: React.ReactNode }) {
  const [level, setLevel] = useState<Level>("all");
  return (
    <>
      <div className={s.choice} role="radiogroup" aria-label="Show players" style={{ marginBottom: 16 }}>
        {LEVELS.map((l) => (
          <label key={l.id}>
            <input type="radio" name="level-filter" checked={level === l.id} onChange={() => setLevel(l.id)} />
            <span>
              {l.label} ({counts[l.id]})
            </span>
          </label>
        ))}
      </div>
      <div data-filter={level}>
        <style>{level === "all" ? "" : `[data-filter="${level}"] li[data-level]:not([data-level="${level}"]){display:none}`}</style>
        {children}
      </div>
    </>
  );
}
