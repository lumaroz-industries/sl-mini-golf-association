/** Shared SVG gradients for the medal icons (rendered once per page). */
export function MedalDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        {[
          ["gold", "#fff3c4", "#f2c94c", "#b7862b", "#7a5414"],
          ["silver", "#ffffff", "#dfe5e8", "#a3adb3", "#5f6a70"],
          ["bronze", "#ffd9b8", "#e09a62", "#a8622f", "#6b3a17"],
        ].map(([id, a, b, c, d]) => (
          <linearGradient key={id} id={`medal-${id}`} x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0" stopColor={a} />
            <stop offset="0.35" stopColor={b} />
            <stop offset="0.75" stopColor={c} />
            <stop offset="1" stopColor={d} />
          </linearGradient>
        ))}
      </defs>
    </svg>
  );
}

export type MedalKind = "gold" | "silver" | "bronze";

export function MedalIcon({ kind, size = 26 }: { kind: MedalKind; size?: number }) {
  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 24 30" aria-hidden="true" focusable="false">
      <path d="M6 1h4.5l2.2 8.5L10.5 13 6 1Z" fill="#0b6b47" />
      <path d="M18 1h-4.5l-2.2 8.5 2.2 3.5L18 1Z" fill="#06432c" />
      <circle cx="12" cy="19.5" r="9" fill={`url(#medal-${kind})`} />
      <circle cx="12" cy="19.5" r="6.4" fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="1" />
      <path d="m12 15.2 1.3 2.7 3 .4-2.2 2.1.5 3-2.6-1.4-2.6 1.4.5-3-2.2-2.1 3-.4Z" fill="rgba(255,255,255,0.55)" />
    </svg>
  );
}
