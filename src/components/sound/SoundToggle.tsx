"use client";

import { useEffect, useState } from "react";
import { isSoundOn, onSoundChange, setSoundOn } from "./soundPref";
import s from "./SoundToggle.module.css";

/**
 * "Sound on / Sound off" button (diamond-white). The choice is remembered
 * for the next visit. `onToggle` runs inside the click, so turning sound on
 * here also satisfies the browser's "needs a tap" rule.
 */
export function SoundToggle({ className, onToggle }: { className?: string; onToggle?: (on: boolean) => void }) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the saved choice after mount
    setOn(isSoundOn());
    return onSoundChange(setOn);
  }, []);
  return (
    <button
      type="button"
      className={`${s.btn} ${className ?? ""}`}
      data-on={on || undefined}
      aria-pressed={on}
      onClick={(e) => {
        e.stopPropagation();
        const next = !on;
        setSoundOn(next);
        onToggle?.(next);
      }}
    >
      <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
        <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
        {on ? (
          <path d="M16 8.5a4.5 4.5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        ) : (
          <path d="M16.5 9.5l5 5m0-5l-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        )}
      </svg>
      {on ? "Sound on" : "Sound off"}
    </button>
  );
}
