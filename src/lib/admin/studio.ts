/**
 * Card Maker: the framing every card photo shares, and the hand-off of a
 * finished photo to the player editor.
 */

/**
 * Card framing, shared by the prompt and the Card photo maker so the two
 * agree: a 4:5 portrait where the head sits in the same place every time.
 * (The card shows roughly the top three quarters of this frame.)
 */
export const FRAME = {
  width: 960,
  height: 1200,
  /** Top of the hair, as a share of the height. */
  headTop: 0.1,
  /** Width of the head (ear to ear, with hair), as a share of the width. */
  headWidth: 0.28,
} as const;

/** Hand-off from the Card Maker to the player editor (sessionStorage, read once). */
export const STUDIO_HANDOFF = "sl-photo-studio";
export interface StudioHandoff {
  slug: string;
  preview: string;
  photo: { src: string; width: number; height: number; alt: string };
  upload: { path: string; blob: string };
}
