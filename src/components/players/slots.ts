import type { FeaturedPlayer } from "@/content/schema";
import type { Slot } from "./types";

/**
 * The seven places in the line-up: three on the left (far left first), the
 * centre, three on the right (nearest the centre first). Players fill their
 * side in the order they are listed; unfilled places become "reveal soon".
 */
export function buildSlots(players: FeaturedPlayer[]): Slot[] {
  const side = (s: FeaturedPlayer["side"]) => players.filter((p) => p.side === s);
  const toCard = (p?: FeaturedPlayer) => p && { slug: p.slug, name: p.name, photo: p.photo, medals: p.medals };
  const left = side("left");
  const right = side("right");
  return [
    ...[-3, -2, -1].map((pos, i) => ({ key: `l${i}`, side: "left" as const, pos, player: toCard(left[i]) })),
    { key: "c", side: "center" as const, pos: 0, player: toCard(side("center")[0]) },
    ...[1, 2, 3].map((pos, i) => ({ key: `r${i}`, side: "right" as const, pos, player: toCard(right[i]) })),
  ];
}
