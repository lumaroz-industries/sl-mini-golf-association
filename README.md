# SL Mini Golf Association

Website for **SL Mini Golf Association**, an independent mini-golf community platform.

- Founder & Owner: Suyash Lahane
- Website Design & Development: Chaitanya Payghan

## Stack

- Next.js (App Router) + TypeScript, pages pre-rendered for SEO
- CSS Modules + design tokens (`src/styles/tokens.css`)
- Zod schemas for all editable content
- Fonts: Clash Display (Fontshare, self-hosted in `src/fonts`) and Manrope (Google Fonts via `next/font`)
- Homepage 3D journey: three.js (plain, no React wrapper) + Lenis smooth scrolling

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run typecheck
```

## Architecture

```
src/
  app/                  root layout, SEO files
    (site)/             the public website (nav + footer layout) and its pages
    admin/              the admin (/admin) — sign-in and editors
    api/                contact form and admin endpoints
  lib/admin/             admin: sign-in, publishing (GitHub or local files), content checks
  components/
    admin/              admin forms and editors
    nav/                floating glass header + full-screen menu
    footer/             global footer
    placeholder/        shared Coming-soon page
    ui/                 Logo, SocialLinks, SocialIcon, Reveal
  sections/home/        journey/ (scroll-driven 3D stage + text overlays), People
  experience/           the 3D engine — fixed, NOT CMS-editable
    timeline/           chapters.ts (master timeline), ballMotion.ts (baked shot)
    course/             path.ts (one continuous course), buildWorld.ts, sweep.ts
    actors/             ball and putter
    camera/             shot list
    engine/             renderer, bloom, render-on-demand loop
    quality.ts          device quality tiers (?quality=high|medium|low to force)
  content/
    schema.ts           content contract (Zod) — also for future admin forms
    repository.ts       the only way UI code reads content
    sources/local/      today's content as JSON
  config/navigation.ts  routes and their status (live / coming-soon)
  styles/               tokens + globals
public/brand/           logo, icon and app-icon files
scripts/brand/          logo generator (redrawn vector logo)
```

### Content vs presentation

All editable text, people, links and contact details live in
`src/content/sources/local/*.json` and are validated against
`src/content/schema.ts`. Components never import JSON directly; they call
functions in `src/content/repository.ts`.

When the admin CMS is built, only the `source` inside `repository.ts` changes
(e.g. to a database); components and types stay as they are.

The 3D experience (course, assets, camera, timeline) is presentation code and is
intentionally **not** part of the content model.

### Editing content today

| What | Where |
|---|---|
| Homepage copy | `src/content/sources/local/home.json` |
| Platform description, tagline, SEO | `src/content/sources/local/site.json` |
| Official email | `site.json` → `contact.email` (hidden while empty) |
| Social links | `site.json` → `social[]`: `url` (platform hidden while empty), optional `handle` and `description` |
| Social media page copy and listed accounts | `src/content/sources/local/social.json` |
| Articles | `src/content/sources/local/articles/*.md` (see the template) |
| Updates | `src/content/sources/local/updates/*.md` (see the template); page copy and type labels in `updates.json` |
| Gallery albums | `gallery-originals/<album>/` + `npm run gallery`, then `src/content/sources/local/gallery/<album>/album.yaml`; page copy in `gallery.json` |
| Articles page copy, categories | `articles.json`, `article-categories.json` |
| People & portraits | `src/content/sources/local/people.json` + image in `public/people/` |

To add Suyash's portrait: put the image in `public/people/` and add a
`portrait` object (src, alt, width, height) to his entry in `people.json`.

## The 3D journey

- Scroll progress (0 → 1) through the pinned journey drives everything:
  camera, ball, putter, lights and the text overlays. Scrolling back reverses
  it exactly; when scrolling stops, nothing renders and the frame holds.
- The ball's motion is simulated once on load (gravity, rolling friction, a
  rail bounce) and then looked up by scroll position, so it is physically
  plausible and fully reversible.
- Everything is generated in code: geometry, turf/stone/concrete textures,
  ball dimples, typography. No downloaded 3D assets.
- Text overlay timings live in `src/experience/timeline/chapters.ts`.
- "Skip intro" (shown until the finale) fades out, jumps straight to the
  finale with the SL logo, and fades back in (`SKIP_TO` in `chapters.ts`).
- Fallbacks: without WebGL2 or JavaScript the same content renders as stacked
  sections. With reduced motion, the 3D view cuts between held stills.

## Articles

`/articles` lists published articles (a featured lead, then a filterable
grid); `/articles/<slug>` is the reading page with contents list, reading
progress, tap-to-load embeds, share links, related articles, structured data
and an auto-generated link preview image.

**Writing an article:** copy
`src/content/sources/local/articles/article-template.md` — it explains every
option and formatting feature. Name the file after its slug
(`my-story.md` → `slug: my-story`), put photos in `public/articles/<slug>/`,
and set `draft: false` to publish.

- Categories: `src/content/sources/local/article-categories.json`.
- Authors: `author: { personId: ... }` for someone in `people.json`, or a
  guest with `author: { name: ..., bio: ... }`.
- Details are checked at build time (missing fields, unknown category or
  author, file name not matching the slug) with a clear message.
- Drafts never appear on the site. To preview them locally:
  `SHOW_DRAFTS=1 npm run dev` (never set this on Vercel).
- In the future admin dashboard these files become a database table and the
  body a rich-text editor that saves the same Markdown.

## Updates

`/updates` is a timeline of short news, newest first: pinned updates on top,
month markers, type filters (kept in the URL), a "New" badge for the last
7 days, and a ball rolling down the putting line as you scroll. Each update
also has its own page (`/updates/<slug>`) with share links and a generated
link preview. Followers can subscribe to the RSS feed at `/updates/feed.xml`.

**Posting an update:** copy
`src/content/sources/local/updates/update-template.md` — it explains every
option. Types: announcement, tournament, result, community, platform.

- Add an `event` block (date, optional times in India time, city, venue,
  registration link) to turn an update into an event card: date badge, live
  "In 12 days / Today / On now / Completed" status (worked out in the
  visitor's browser, so it never goes stale), Register button and
  Add to calendar (Google, Outlook.com, Apple/.ics). Events are also marked
  up for Google as sports events.
- Optional: `pinned`, `image`, an `action` button, and `article` (slug of a
  published article to link to).
- Drafts and validation work exactly like articles.

## Players

`/players` opens with **Maharashtra's Top 7**: seven collectible-style
cards in a 3D line-up — three girls on the left, a girl in the centre, three
boys on the right. The centre card is in front by default; hovering (laptop)
or tapping / swiping (phone) brings a card forward and slides its neighbours
aside. Only the front card shows its ↗ arrow, which opens the player's own
page (`/players/<slug>`) with a large card, medal tally and optional bio.

Cards show only the photo, name and gold / silver / bronze counts. Places
without a player show "Reveal soon".

**Adding a player** — in `src/content/sources/local/players.json`, add to
`featured`:

```json
{
  "slug": "first-last",
  "name": "First Last",
  "side": "left",
  "photo": { "src": "/players/first-last.webp", "alt": "First Last", "width": 800, "height": 1000 },
  "medals": { "gold": 3, "silver": 1, "bronze": 2 },
  "bio": "Optional. Separate paragraphs with a blank line."
}
```

- `side`: `left` (up to 3), `center` (1) or `right` (up to 3).
- `place` (optional, left/right only): `1` next to the centre card, `2` one
  further out, `3` the outer edge. Players without one fill the free places,
  nearest the centre first, in the order listed.
  This is layout only — the site never ranks or numbers the players.
- Leave a medal count out (rather than 0) if it is not known — the card
  shows "–".
- Put a portrait photo (about 4:5) in `public/players/`.
- **Whenever the Top 7 cards change** (a player, photo, medal count or the
  card design), also retake the line-up screenshot used in the first article:
  `public/articles/beyond-the-green-inside-sl-mini-golf-association/top-7.webp`
  (1600 × 620, the line-up centred, site header hidden). The article's other
  images are homepage renders and don't need updating.
- The heading, intro and note are in the same file.

## Gallery

`/gallery` is one justified photo wall of every album, with album filter
chips (kept in the URL). Each album also has its own page
(`/gallery/<album>`) with a cover header, a share-preview collage and a
"want a photo removed?" note. Tapping a photo opens a full-screen viewer:
swipe or arrow keys to move, swipe down / Esc / Back to close, double-tap or
pinch to zoom, and "Copy link" for a link that opens that exact photo.
Downloads are not offered.

**Adding photos**

1. Create a folder per album in `gallery-originals/` named like the album
   slug, e.g. `gallery-originals/pune-open-2026/`, and put the original
   photos in it (JPG, PNG or WebP — export iPhone HEIC photos as JPG). This
   folder is **not committed**; keep your originals backed up elsewhere.
2. Run `npm run gallery`. It resizes every photo to web sizes, turns phone
   photos the right way up, strips all hidden metadata (including GPS
   location), makes blur-up placeholders and a link-preview collage, and
   adds any new photos to `src/content/sources/local/gallery/<album>/album.yaml`.
3. Open that `album.yaml`: set the title, date, city and description, and
   write the **alt text** (a short description) for every photo — the build
   stops until each photo has one. Captions and a `cover` photo are optional.
4. Commit `public/gallery/<album>/` and the album folder in
   `src/content/sources/local/gallery/`.

Re-running the command only processes new or changed photos; deleting a
photo from the originals folder removes it from the site. Photos are resized
ahead of time so the site never relies on Vercel's limited on-the-fly image
optimisation. For thousands of photos, move to cloud storage with the
future admin uploader.

## Social media page

`/social-media` is one grid of cards (no sections):

1. The association's **own** channels (`site.json` → `social[]`) lead the
   grid as featured "Official" cards — hidden until their URLs are set. Only
   these appear in the footer, menu and search-engine structured data.
2. Then every entry in `src/content/sources/local/social.json` → `accounts`,
   in the order listed: other organisations, people and channels.

Each account has `type` (`organisation` | `person` | `channel`), `platform`,
`url`, and either a `name` or a `personId` (links to `people.json` for the
name, role and portrait). Optional: `handle` (otherwise derived from the URL),
`label` (e.g. a city), `description`, `featured` (wider card). YouTube
channels render as a full-width feature.

URLs are checked at build time: each must be `https://` on that platform's
own domain, otherwise the build stops with a clear message.

## Contact page

`/contact` offers exactly two channels: the official email (from `site.json`,
hidden until provided) and a contact form.

- Validation runs in the browser for instant feedback and again on the server
  (`src/lib/contact/schema.ts` is shared by both).
- Spam protection: hidden honeypot field, minimum fill time, same-origin
  check, body size limit and a per-IP rate limit (5 per 10 minutes,
  best-effort per server instance). Suspected bots get a normal-looking
  response and nothing is sent.
- Delivery uses [Resend](https://resend.com) (free tier) through its HTTP API.
  **The form stays visibly closed until it is configured** — the site never
  claims a message was sent when it was not.

To switch it on, set these in Vercel → Project → Settings → Environment
Variables, then redeploy (the page is pre-rendered, so it picks up the change
on the next build):

| Variable | Value |
|---|---|
| `RESEND_API_KEY` | API key from the Resend dashboard |
| `CONTACT_TO_EMAIL` | optional — the inbox that receives messages; defaults to the official email in `site.json` |
| `CONTACT_FROM_EMAIL` | optional — e.g. `SL Mini Golf Association <hello@your-domain>`; requires a domain verified in Resend |

To check the setup on the live site, open `/api/contact` in a browser: it
reports `configured`, `hasApiKey` and where the recipient comes from (never
the key or the address).

Without a verified domain, Resend's test sender only delivers to the email
address that owns the Resend account, so create the Resend account with the
association's official inbox. See `.env.example`.

## Admin

`/admin` lets the owner and the developer post, edit and delete **updates**,
**articles** and **gallery albums** without touching code. (Players are not
in the admin yet.)

- **No database.** Everything is saved as the same files described above
  (Markdown, `album.yaml`, images). On the live site, **Publish** makes one
  commit to the GitHub repository through the GitHub API; Vercel sees it and
  rebuilds, so the change is live about 1–2 minutes later — the admin shows
  “Live on the website” when it is.
- Every save is checked with the same rules as the website build (required
  fields, dates, links, photo descriptions, linked articles), so a publish
  cannot break the site.
- Photos are shrunk in the browser, then resized on the server to the same
  web sizes as `npm run gallery` (WebP, blur placeholders, link-preview
  collage), with hidden metadata such as GPS location removed. Images an item
  no longer uses are deleted with it.
- **Drafts:** “Save draft” stores it without showing it on the site.
  Web addresses are fixed after the first save so shared links never break.
- Article and update text has formatting buttons (headings, bold, links,
  lists, quotes, photos and galleries, YouTube/Instagram) and a **Preview**
  that renders exactly like the website. Videos are YouTube/Instagram links —
  video files are not uploaded (the repository and Vercel are not built for
  large files).

**Security:** one shared password (`ADMIN_PASSWORD`); a signed, HttpOnly
session cookie that keeps a device signed in until **Sign out** (up to 400
days, the browser limit); changes must come from the site itself; 8 wrong
passwords lock sign-in for 15 minutes. `/admin` is hidden from search engines.
Changing `ADMIN_PASSWORD` signs everyone out.

### Switching it on (once)

1. **Password** — Vercel → Project → Settings → Environment Variables: add
   `ADMIN_PASSWORD` (a long password, at least 8 characters).
2. **GitHub token** — on GitHub: Settings → Developer settings → Personal
   access tokens → **Fine-grained tokens** → Generate new token.
   - Repository access: *Only select repositories* → this repository.
   - Permissions → Repository permissions → **Contents: Read and write**.
   - Expiration: the longest you are comfortable with (set a reminder).
   Add it in Vercel as `ADMIN_GITHUB_TOKEN`. (`ADMIN_GITHUB_REPO` and
   `ADMIN_GITHUB_BRANCH` are only needed if Vercel does not deploy this
   repository's `main` branch.)
3. Redeploy, then open `/admin` on the live site.

Each publish is a normal commit (“Admin: Publish update …”), so the full
history is in GitHub and anything can be restored from there. Pull before
editing code locally, since the admin commits to `main`.

**Locally** (`npm run dev` with `ADMIN_PASSWORD` set and no token) the admin
writes straight into this folder, which is handy for trying it out.

## SL Admin app (Android APK)

The admin is also an Android app, **SL Admin**. The app holds no copy of the
admin: it opens the live `/admin` page full-screen (a *Trusted Web Activity*,
running on Chrome), so **every change to the admin appears in the app without
reinstalling**. Sign-in, photo uploads and everything else work exactly as on
the website; website and app can be used side by side.

- Project: `android/` (package `com.slminigolfassociation.admin`).
  The website address is `siteHost` in `android/app/build.gradle`.
- Built by GitHub Actions (`.github/workflows/sl-admin-apk.yml`) whenever
  `android/` changes, or manually: GitHub → Actions → **SL Admin APK** → Run
  workflow. Each build is published as a GitHub **Release** with
  `SL-Admin.apk` attached.
- Signed with a permanent key stored as repository secrets
  `SL_ADMIN_KEYSTORE_BASE64` and `SL_ADMIN_KEYSTORE_PASSWORD`. **Keep a backup
  of the key** — every future version must be signed with the same key, or
  phones will refuse to install it over the old app.
- `public/.well-known/assetlinks.json` proves the app belongs to the site
  (it holds the key's SHA-256 fingerprint). Without it, the app shows a
  browser address bar.
- **Rebuild only when** the website moves to a new domain (change `siteHost`
  and add the new domain's `assetlinks.json`), or the name/icon changes
  (icons: `node scripts/brand/build-admin-icons.mjs`).

**Installing:** open the latest release on the phone, download
`SL-Admin.apk`, tap it and allow “Install unknown apps” for that browser or
file manager. A newer APK installs over the old one.

**Without the APK:** on Android, open `/admin` in Chrome → ⋮ → *Install app*;
on iPhone, open it in Safari → Share → *Add to Home Screen*. Both give the same
“SL Admin” app icon.

## Brand assets

The logo was redrawn as clean vector geometry from the approved traced logo.
To regenerate the SVGs after a tweak:

```bash
python3 scripts/brand/build-logo.py
```

| File | Use |
|---|---|
| `public/brand/slmga-logo-dark.svg` / `.png` | full logo on dark backgrounds |
| `public/brand/slmga-logo-light.svg` / `.png` | full logo on light backgrounds |
| `public/brand/slmga-icon-*.svg` | SL mark with emerald slash |
| `public/brand/slmga-app-icon.svg`, `icon-192/512.png` | app / PWA icon |
| `src/app/icon.svg`, `favicon.ico`, `apple-icon.png` | browser icons |

## Deployment

Hosted on Vercel (free tier). Import the GitHub repository at vercel.com →
*Add New Project*; no environment variables are required yet. The site uses
the Vercel production URL until a custom domain is configured
(`site.json` → `siteUrl`).
