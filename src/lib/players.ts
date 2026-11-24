import type { Player } from "@/content/schema";

export type MedalTotals = { gold?: number; silver?: number; bronze?: number };

/** Medal totals: the given totals if set, otherwise counted from the results. */
export function medalTotals(p: Pick<Player, "medals" | "results">): MedalTotals {
  if (p.medals && Object.values(p.medals).some((v) => v !== undefined)) return p.medals;
  if (!p.results.length) return {};
  const t = { gold: 0, silver: 0, bronze: 0 };
  for (const r of p.results) if (r.medal) t[r.medal]++;
  return t;
}

export const totalMedals = (t: MedalTotals) => (t.gold ?? 0) + (t.silver ?? 0) + (t.bronze ?? 0);

export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/** "1st", "2nd", "3rd", "4th"… */
export function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
