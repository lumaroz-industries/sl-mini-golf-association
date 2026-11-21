import type { MetadataRoute } from "next";
import { navigation } from "@/config/navigation";
import { getBaseUrl } from "@/lib/site-url";

/** Only live routes are listed; placeholders are excluded until built. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await getBaseUrl();
  return navigation
    .filter((item) => item.status === "live")
    .map((item) => ({ url: new URL(item.href, base).toString(), changeFrequency: "monthly", priority: item.href === "/" ? 1 : 0.7 }));
}
