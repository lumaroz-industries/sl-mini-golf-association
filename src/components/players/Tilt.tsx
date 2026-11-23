"use client";

/** Pointer tilt + holo for a single card (mouse only). */
export function Tilt({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={className}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const el = e.currentTarget;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        el.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
        el.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
        el.style.setProperty("--tx", `${((px - 0.5) * 14).toFixed(2)}deg`);
        el.style.setProperty("--ty", `${((0.5 - py) * 12).toFixed(2)}deg`);
      }}
      onPointerLeave={(e) => {
        for (const v of ["--mx", "--my", "--tx", "--ty"]) e.currentTarget.style.removeProperty(v);
      }}
    >
      {children}
    </div>
  );
}
