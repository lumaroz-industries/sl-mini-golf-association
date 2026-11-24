import type { FeaturedSlot, Player } from "@/content/schema";
import { medalTotals } from "@/lib/players";
import type { Slot } from "./types";

type Entry = FeaturedSlot & { player: Player };

/**
 * The seven places in the line-up: three on the left, the centre, three on
 * the right. A player with a `place` (1 = next to the centre … 3 = outer
 * edge) goes exactly there; the rest fill the free places, nearest the centre
 * first, in the order listed. Unfilled places become "reveal soon".
 */
function arrange(entries: Entry[]): Array<Entry | undefined> {
  const places: Array<Entry | undefined> = [undefined, undefined, undefined];
  for (const p of entries) if (p.place !== undefined) places[p.place - 1] = p;
  for (const p of entries) {
    if (p.place !== undefined) continue;
    const free = places.findIndex((x) => x === undefined);
    if (free !== -1) places[free] = p;
  }
  return places;
}

export function buildSlots(entries: Entry[]): Slot[] {
  const side = (s: FeaturedSlot["side"]) => entries.filter((p) => p.side === s);
  const toCard = (e?: Entry) => e && { slug: e.player.slug, name: e.player.name, photo: e.player.photo, medals: medalTotals(e.player) };
  const left = arrange(side("left")); // index 0 = next to the centre
  const right = arrange(side("right"));
  return [
    ...[-3, -2, -1].map((pos, i) => ({ key: `l${i}`, side: "left" as const, pos, player: toCard(left[-pos - 1]) })),
    { key: "c", side: "center" as const, pos: 0, player: toCard(side("center")[0]) },
    ...[1, 2, 3].map((pos, i) => ({ key: `r${i}`, side: "right" as const, pos, player: toCard(right[i]) })),
  ];
}
