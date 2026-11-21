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
  app/                  routes, root layout (nav + footer), SEO files
    players/ articles/ updates/ gallery/ social-media/ contact/
                        → branded "Coming soon" placeholders (noindex)
  components/
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
| Social links | `site.json` → `social[].url` (each platform hidden while empty) |
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
- Fallbacks: without WebGL2 or JavaScript the same content renders as stacked
  sections. With reduced motion, the 3D view cuts between held stills.

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
| `CONTACT_TO_EMAIL` | the inbox that receives messages |
| `CONTACT_FROM_EMAIL` | optional — e.g. `SL Mini Golf Association <hello@your-domain>`; requires a domain verified in Resend |

Without a verified domain, Resend's test sender only delivers to the email
address that owns the Resend account, so create the Resend account with the
association's official inbox. See `.env.example`.

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
