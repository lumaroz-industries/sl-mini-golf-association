#!/usr/bin/env node
/**
 * Icons for the "SL Mini Golf" Android app (the public website): the SL mark
 * with its emerald slash on black — the admin app has the gold ADMIN label
 * instead, so the two are never confused. (No splash image: the app goes
 * straight to the website.)
 * Run: node scripts/brand/build-site-app-icons.mjs
 */
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const MARK =
  "M337 0L322 52H99A23 23 0 0 0 76 75V75A23 23 0 0 0 99 98H267A62 62 0 0 1 329 160V186A62 62 0 0 1 267 248H0L15 196H238A23 23 0 0 0 261 173V173A23 23 0 0 0 238 150H70A62 62 0 0 1 8 88V62A62 62 0 0 1 70 0ZM359 0H427V173A23 23 0 0 0 450 196H605V248H359Z";
const RES = "android/site/src/main/res";

/** The SL mark and slash (752 × 248 units) centred in a 1024 box; scale 1 fills the safe zone. */
function icon({ rounded, background = true, scale = 1 }) {
  const s = 1.15 * scale;
  const x = 512 - (752 * s) / 2;
  const y = 512 - (248 * s) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs><radialGradient id="glow" cx="0.5" cy="0.45" r="0.6"><stop offset="0" stop-color="#0b3d2a" stop-opacity="0.9"/><stop offset="1" stop-color="#050807" stop-opacity="0"/></radialGradient></defs>
  ${background ? `<rect width="1024" height="1024" ${rounded ? 'rx="224"' : ""} fill="#050807"/><rect width="1024" height="1024" ${rounded ? 'rx="224"' : ""} fill="url(#glow)"/>` : ""}
  <g transform="translate(${x} ${y}) scale(${s})">
    <path fill="#FFFFFF" transform="matrix(1 0 -0.43 1 107.88 0)" d="${MARK}"/>
    <path fill="#00A86B" d="M740 2H751L665 248H654Z"/>
  </g>
</svg>`;
}

const out = async (svgText, size, file) => {
  await sharp(Buffer.from(svgText)).resize(size, size).png({ compressionLevel: 9 }).toFile(file);
};

await mkdir(`${RES}/drawable`, { recursive: true });
for (const [d, px] of Object.entries({ mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 })) {
  await mkdir(`${RES}/mipmap-${d}`, { recursive: true });
  await out(icon({ rounded: true, scale: 0.78 }), px, `${RES}/mipmap-${d}/ic_launcher.png`);
}
await out(icon({ rounded: false, background: false, scale: 0.55 }), 432, `${RES}/drawable/ic_launcher_foreground.png`);

console.log("✓ SL Mini Golf app icons written");
