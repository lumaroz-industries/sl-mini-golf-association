import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getSiteSettings, getUpdate, getUpdatesPageContent } from "@/content/repository";
import { formatDate } from "@/lib/format";
import { formatEventWhen, formatEventWhere } from "@/lib/events";

/** Link preview image for each update. */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "SL Mini Golf Association update";

export default async function OpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [u, site, content, font, logo] = await Promise.all([
    getUpdate(slug),
    getSiteSettings(),
    getUpdatesPageContent(),
    readFile(path.join(process.cwd(), "src/fonts/og/ClashDisplay-600.ttf")),
    readFile(path.join(process.cwd(), "public/brand/slmga-logo-dark.svg"), "utf8"),
  ]);
  const title = u?.title ?? site.name;
  const fontSize = title.length > 70 ? 54 : title.length > 45 ? 64 : 76;
  const footer = u ? (u.event ? `${formatEventWhen(u.event)}  ·  ${formatEventWhere(u.event)}` : formatDate(u.publishedAt)) : "";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", background: "radial-gradient(900px 520px at 15% 115%, rgba(0,168,107,0.4), rgba(5,8,7,0) 70%), #050807", color: "#fff", fontFamily: "Clash" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
          <img src={`data:image/svg+xml;base64,${Buffer.from(logo).toString("base64")}`} width={360} height={50} />
          {u && (
            <div style={{ display: "flex", padding: "10px 22px", background: "#00a86b", borderRadius: 999, color: "#050807", fontSize: 22, letterSpacing: 3, textTransform: "uppercase" }}>
              {`${content.kicker} · ${content.typeLabels[u.type]}`}
            </div>
          )}
        </div>
        <div style={{ display: "flex", fontSize, lineHeight: 1.02, letterSpacing: -1, maxWidth: 1040, textTransform: "uppercase" }}>{title}</div>
        <div style={{ display: "flex", fontSize: 26, color: u?.event ? "#19d18c" : "#a7b0ac" }}>{footer}</div>
      </div>
    ),
    { ...size, fonts: [{ name: "Clash", data: font, weight: 600, style: "normal" }] },
  );
}
