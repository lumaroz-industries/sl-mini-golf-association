import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getArticle, getSiteSettings } from "@/content/repository";
import { formatDate } from "@/lib/format";

/** Link preview image for each article: title on the brand background. */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "SL Mini Golf Association article";

export default async function OpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [article, site, font, logo] = await Promise.all([
    getArticle(slug),
    getSiteSettings(),
    readFile(path.join(process.cwd(), "src/fonts/og/ClashDisplay-600.ttf")),
    readFile(path.join(process.cwd(), "public/brand/slmga-logo-dark.svg"), "utf8"),
  ]);
  const title = article?.title ?? site.name;
  const fontSize = title.length > 70 ? 56 : title.length > 45 ? 66 : 78;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "radial-gradient(900px 520px at 85% 110%, rgba(0,168,107,0.42), rgba(5,8,7,0) 70%), #050807",
          color: "#fff",
          fontFamily: "Clash",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
          <img src={`data:image/svg+xml;base64,${Buffer.from(logo).toString("base64")}`} width={360} height={50} />
          {article && (
            <div style={{ display: "flex", padding: "10px 22px", border: "2px solid rgba(0,168,107,0.6)", borderRadius: 999, color: "#19d18c", fontSize: 22, letterSpacing: 3, textTransform: "uppercase" }}>
              {article.category.label}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", width: 90, height: 6, background: "#00a86b", borderRadius: 3 }} />
          <div style={{ display: "flex", fontSize, lineHeight: 1.02, letterSpacing: -1, maxWidth: 1000, textTransform: "uppercase" }}>{title}</div>
        </div>
        <div style={{ display: "flex", gap: 18, fontSize: 24, color: "#a7b0ac" }}>
          {article ? [article.author.name, formatDate(article.publishedAt), `${article.readingMinutes} min read`].join("   ·   ") : site.description}
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Clash", data: font, weight: 600, style: "normal" }] },
  );
}
