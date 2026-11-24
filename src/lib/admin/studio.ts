/**
 * Photo Studio: outfits and the prompt the admins paste into a free image
 * app (Gemini or ChatGPT) together with a player's photo.
 *
 * The prompt is written to do one job — turn any phone photo into a studio
 * portrait that fits the player card exactly — and to forbid everything else:
 * the face, skin tone and body must stay the person's own.
 *
 * ADDING THE REAL OUTFITS
 * Put a clear photo of each outfit in public/studio/outfits/ (front view,
 * flat or on a person, good light) and set its `reference` below, e.g.
 * reference: "/studio/outfits/india-jersey.jpg". The prompt then tells the
 * app to copy that outfit exactly, and the Studio offers the photo for
 * download so it can be attached as the second image.
 */

export type Gender = "female" | "male";

export interface Outfit {
  id: string;
  label: string;
  /** Short line shown under the button. */
  note: string;
  /** Only for players who have represented India — the admins decide. */
  national?: boolean;
  /** Outfit reference photo in /public (see above). */
  reference?: string;
  /** How to describe the outfit when there is no reference photo yet. */
  describe: (g: Gender) => string;
}

export const OUTFITS: Outfit[] = [
  {
    id: "india-jersey",
    label: "India team jersey",
    note: "Only for players who have represented India.",
    national: true,
    reference: undefined,
    describe: (g) =>
      `a short-sleeved athletic team polo jersey in deep navy blue with thin saffron and green trim on the collar and sleeve cuffs, ${g === "female" ? "in a women's athletic fit" : "in a men's athletic fit"}, smooth technical fabric with natural folds`,
  },
  {
    id: "india-blazer",
    label: "India team blazer",
    note: "Only for players who have represented India.",
    national: true,
    reference: undefined,
    describe: (g) =>
      `a tailored navy-blue single-breasted team blazer${g === "female" ? " in a women's cut" : ""}, buttoned, over a crisp white collared shirt with a navy tie, neatly pressed`,
  },
  {
    id: "maharashtra-jersey",
    label: "Maharashtra team jersey",
    note: "For Maharashtra state team players.",
    reference: undefined,
    describe: (g) =>
      `a short-sleeved athletic team polo jersey in saffron orange with white trim on the collar and sleeve cuffs, ${g === "female" ? "in a women's athletic fit" : "in a men's athletic fit"}, smooth technical fabric with natural folds`,
  },
  {
    id: "black-polo",
    label: "Plain black polo",
    note: "Neutral — suits anyone.",
    describe: (g) => `a plain black short-sleeved polo shirt${g === "female" ? " in a women's fit" : ""}, matte cotton piqué, collar neatly laid flat, top button open`,
  },
  {
    id: "own",
    label: "Keep their own clothes",
    note: "Only a studio photo — same clothes.",
    describe: () => "",
  },
];

export const outfitById = (id: string) => OUTFITS.find((o) => o.id === id);

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

export interface PromptInput {
  outfit: Outfit;
  gender: Gender;
  /** Player's name — never sent to the app, only used for the file name/notes. */
  name?: string;
}

/** The main prompt. Plain text, numbered, so it survives copy/paste anywhere. */
export function buildPrompt({ outfit, gender }: PromptInput): string {
  const person = gender === "female" ? "woman" : "man";
  const own = outfit.id === "own";
  const ref = !!outfit.reference;

  const outfitBlock = own
    ? `3. CLOTHES
- Keep exactly the clothes the ${person} is wearing in IMAGE 1: same garment, colour, pattern, collar and any text or logos on it. Only make them look neat and freshly pressed.`
    : ref
      ? `3. OUTFIT — copy IMAGE 2 exactly
- Dress the ${person} in the outfit shown in IMAGE 2. Copy it exactly: same colours, panels, trims, collar, buttons, fabric and every logo, badge, flag and word in the same place and size.
- Fit it naturally to this ${person}'s real body and build, ${gender === "female" ? "in the women's cut" : "in the men's cut"}. Do not change their body shape or size.
- IMAGE 2 is only for the clothes. Never take a face, hair, skin or body from IMAGE 2.
- Do not add any logo, text, number, flag or badge that is not in IMAGE 2.`
      : `3. OUTFIT
- Dress the ${person} in ${outfit.describe(gender)}.
- Fit it naturally to this ${person}'s real body and build. Do not change their body shape or size.
- The outfit must have NO text, NO numbers, NO logos, NO flags and NO badges of any kind.`;

  return `Create a professional studio portrait from ${ref ? "the photos I attached. IMAGE 1 is the person. IMAGE 2 is the outfit." : "the photo I attached (IMAGE 1)."}

THE ONE RULE ABOVE ALL: the person must stay 100% the same real person. Someone who knows them must recognise them instantly. If any instruction below would change who they are, ignore that instruction.

1. IDENTITY LOCK — do not change the person
- Keep the face exactly as in IMAGE 1: face shape, jawline, chin, cheeks, nose, lips, eyes, eye colour, eyebrows, ears, teeth, moles, marks and scars.
- Keep the exact skin tone and complexion from IMAGE 1. Do NOT lighten, darken, whiten, smooth, airbrush or "beautify" the skin. Keep natural skin texture and pores.
- Keep the same hairstyle, hair length, hair colour and hairline. Keep facial hair exactly as it is (or no facial hair if there is none).
- Keep their age, body shape, weight and build. Do not make them slimmer, taller, older or younger.
- Keep glasses, earrings, bindi, nose pin and other personal items exactly as in IMAGE 1. Do not add any.
- Keep their real expression; if the face is unclear, use a gentle, natural, closed-mouth smile that matches IMAGE 1.

2. POSE
- Facing the camera straight on: head, shoulders and chest square to the camera, head level (not tilted), looking directly into the lens.
- Shoulders relaxed and level, arms hanging naturally at the sides (or hands loosely together in front at waist level). Nothing held in the hands.
- Standing upright with good posture.

${outfitBlock}

4. FRAMING — exact
- Portrait orientation, aspect ratio exactly 4:5 (for example 1200 × 1500 pixels).
- Waist-up shot ("medium shot"): the bottom of the image cuts across the waist.
- The face is exactly centred left-to-right.
- The top of the hair is about 10% of the image height below the top edge — a small, even gap of background above the head. Never crop the top of the head.
- The head (ear to ear, including hair) is about 28% of the image width.
- Both shoulders fully inside the image, with background visible on both sides.
- Camera at eye level, 85 mm portrait lens look, no wide-angle distortion.

5. BACKGROUND
- One plain, seamless studio backdrop in very dark charcoal grey (#1A1D1C), smooth, with no texture, no gradient patterns, no objects, no shadows of objects.
- Nothing else in the image: no other people, no props, no furniture, no text, no watermark, no border, no frame.
- Keep a clean, clear edge around the hair and shoulders, so the person can be cut out of the background easily.

6. LIGHT AND QUALITY
- Soft professional studio lighting: large soft key light from the front-left, gentle fill, subtle rim light on hair and shoulders to separate them from the dark background.
- Even, natural light on the face; no harsh shadows, no colour cast. Skin must look exactly like their real skin under good light.
- Photorealistic like a real DSLR photo, sharp focus on the eyes, high resolution, natural colours. Not a painting, not a cartoon, not 3D, not plastic-looking.

Before you finish, check: is it unmistakably the same person as IMAGE 1, with the same skin tone? Is the framing exactly as described in 4? If not, fix it.

Reply with the image only.`;
}

/** Short follow-up prompts for when the first result is not right. */
export const FIXES: Array<{ id: string; label: string; text: string }> = [
  {
    id: "face",
    label: "Face looks different",
    text: "The face changed. Redo it so the face is identical to IMAGE 1 — same face shape, eyes, nose, lips, jawline, eyebrows and marks. Keep everything else in your last image (outfit, pose, framing, background, light).",
  },
  {
    id: "skin",
    label: "Skin tone changed",
    text: "The skin tone changed. Make the skin exactly the same tone and complexion as in IMAGE 1 — do not lighten, darken or smooth it, keep natural skin texture. Keep everything else in your last image the same.",
  },
  {
    id: "framing",
    label: "Framing is off",
    text: "Fix the framing only: portrait 4:5, waist-up, face exactly centred, a small gap above the hair (about 10% of the height), head about 28% of the image width, both shoulders fully in the image. Keep the person, outfit and light exactly the same.",
  },
  {
    id: "pose",
    label: "Not facing the camera",
    text: "Turn the person to face the camera straight on: shoulders square, head level, looking into the lens, arms relaxed at the sides. Keep the same face, outfit, framing and background.",
  },
  {
    id: "background",
    label: "Background not plain",
    text: "Make the background one plain, seamless very dark charcoal grey (#1A1D1C) studio backdrop with nothing else in it. Keep the person, outfit, pose and framing exactly the same.",
  },
  {
    id: "text",
    label: "Added text or logos",
    text: "Remove every word, number, logo, flag and badge you added that is not in my reference. Keep everything else exactly the same.",
  },
  {
    id: "hands",
    label: "Hands or body look wrong",
    text: "Fix the hands and arms so they look natural and anatomically correct (five fingers each, relaxed at the sides). Keep the face, outfit, framing and background exactly the same.",
  },
];

/** What the admins check before using a result. */
export const CHECKS = [
  "It is clearly the same person — compare the face side by side with the original.",
  "Skin tone is the same as the original (not lighter, not darker).",
  "Hair, glasses and jewellery are their own.",
  "No made-up text, numbers or logos on the clothes.",
  "Hands and fingers look normal.",
];

/** Hand-off from the Photo Studio to the player editor (sessionStorage, read once). */
export const STUDIO_HANDOFF = "sl-photo-studio";
export interface StudioHandoff {
  slug: string;
  preview: string;
  photo: { src: string; width: number; height: number; alt: string };
  upload: { path: string; blob: string };
}
