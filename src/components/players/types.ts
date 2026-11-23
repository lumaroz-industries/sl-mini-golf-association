import type { ImageAsset } from "@/content/schema";

export interface CardPlayer {
  slug: string;
  name: string;
  photo?: ImageAsset;
  medals: { gold?: number; silver?: number; bronze?: number };
}

export interface Slot {
  key: string;
  side: "left" | "center" | "right";
  /** Position in the line-up: −3 (far left) … 0 (centre) … +3 (far right). */
  pos: number;
  player?: CardPlayer;
}
