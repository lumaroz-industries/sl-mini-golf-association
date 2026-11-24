#!/usr/bin/env node
/**
 * Icons for the "SL Admin" app (website install + Android APK):
 * the SL mark with a gold ADMIN label, so it is never mistaken for the
 * public site's icon. Run: node scripts/brand/build-admin-icons.mjs
 */
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const MARK =
  "M337 0L322 52H99A23 23 0 0 0 76 75V75A23 23 0 0 0 99 98H267A62 62 0 0 1 329 160V186A62 62 0 0 1 267 248H0L15 196H238A23 23 0 0 0 261 173V173A23 23 0 0 0 238 150H70A62 62 0 0 1 8 88V62A62 62 0 0 1 70 0ZM359 0H427V173A23 23 0 0 0 450 196H605V248H359Z";

/** content: the mark + label, drawn inside a 1024 box at the given scale (1 = fills the safe zone). */
function svg({ rounded, background = true, scale = 1 }) {
  const s = 0.86 * scale;
  const markW = 712 * s; // mark is ~712 units wide after skew
  const x = 512 - markW / 2 + 40 * s; // the skewed mark sits left of its box
  const y = 512 - 170 * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbecc4"/><stop offset="0.5" stop-color="#e3c27a"/><stop offset="1" stop-color="#b38d45"/></linearGradient></defs>
  ${background ? `<rect width="1024" height="1024" ${rounded ? 'rx="224"' : ""} fill="#050807"/>` : ""}
  <g transform="translate(${x} ${y}) scale(${s})"><path fill="#FFFFFF" transform="matrix(1 0 -0.43 1 107.88 0)" d="${MARK}"/></g>
  <rect x="${512 - 150 * scale}" y="${512 + 130 * scale}" width="${300 * scale}" height="${4 * scale}" fill="url(#g)"/>
  <text x="512" y="${512 + 232 * scale}" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700" font-size="${86 * scale}" letter-spacing="${26 * scale}" fill="url(#g)">ADMIN</text>
</svg>`;
}

const out = async (svgText, size, file) => {
  await sharp(Buffer.from(svgText)).resize(size, size).png({ compressionLevel: 9 }).toFile(file);
};

await mkdir("android/app/src/main/res/drawable", { recursive: true });
// Website install (Chrome "Install app", iPhone "Add to Home Screen")
await out(svg({ rounded: true }), 192, "public/brand/admin-icon-192.png");
await out(svg({ rounded: true }), 512, "public/brand/admin-icon-512.png");
await out(svg({ rounded: false, scale: 0.8 }), 512, "public/brand/admin-icon-maskable-512.png");
await out(svg({ rounded: false, scale: 0.9 }), 180, "public/brand/admin-apple-icon.png");
// Android app: legacy icons per density, adaptive foreground, splash
for (const [d, px] of Object.entries({ mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 })) {
  await mkdir(`android/app/src/main/res/mipmap-${d}`, { recursive: true });
  await out(svg({ rounded: true }), px, `android/app/src/main/res/mipmap-${d}/ic_launcher.png`);
}
await out(svg({ rounded: false, background: false, scale: 0.62 }), 432, "android/app/src/main/res/drawable/ic_launcher_foreground.png");
await out(svg({ rounded: false, background: false, scale: 0.9 }), 512, "android/app/src/main/res/drawable/splash.png");
console.log("✓ admin icons written");
