import "server-only";
import { getSiteSettings } from "@/content/repository";

/**
 * Absolute base URL. Uses the CMS-configured URL when set, otherwise the
 * Vercel production domain, otherwise localhost. No custom domain is assumed.
 */
export async function getBaseUrl(): Promise<URL> {
  const { siteUrl } = await getSiteSettings();
  if (siteUrl) return new URL(siteUrl);
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return new URL(`https://${vercel}`);
  return new URL(`http://localhost:${process.env.PORT ?? 3000}`);
}
