"use client";

/**
 * The visitor's sound choice for the homepage (intro and falling-ball
 * animation), remembered in this browser. On by default.
 */
const KEY = "sl-sound";
const EVENT = "sl-sound-change";

export function isSoundOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundOn(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {}
  window.dispatchEvent(new CustomEvent(EVENT, { detail: on }));
}

/** Calls back whenever the choice changes (from any sound button on the page). */
export function onSoundChange(cb: (on: boolean) => void) {
  const h = (e: Event) => cb((e as CustomEvent<boolean>).detail);
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
}
