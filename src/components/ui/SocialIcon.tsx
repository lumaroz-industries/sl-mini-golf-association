import type { SocialPlatform } from "@/content/schema";

/** Minimal line-style platform icons drawn to match the site's visual language. */
const icons: Record<SocialPlatform, React.ReactNode> = {
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  youtube: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="4.5" />
      <path d="M10 9.2 15 12l-5 2.8Z" fill="currentColor" stroke="none" />
    </>
  ),
  facebook: <path d="M14.5 21v-7.5h2.7l.4-3.2h-3.1V8.4c0-.9.3-1.6 1.6-1.6h1.6V4c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.3H8.6v3.2h2.7V21" />,
  linkedin: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3.5" />
      <path d="M8 10.5V17M12 17v-6.5M12 13.4c0-1.7 1-2.9 2.5-2.9s2.5 1 2.5 2.9V17" />
      <circle cx="8" cy="7.4" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M4 20.2 5.2 16.3A8.6 8.6 0 1 1 8.1 19.1Z" />
      <path d="M9.2 8.1c-.4.3-.8.9-.7 1.6.3 2.5 2.6 4.8 5.2 5.3.7.1 1.3-.3 1.6-.8l.2-.6-2-1-.9.8c-1-.4-2-1.4-2.4-2.4l.8-.9-.9-2.1Z" fill="currentColor" stroke="none" />
    </>
  ),
};

export const platformLabels: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  whatsapp: "WhatsApp",
};

export function SocialIcon({ platform, size = 20 }: { platform: SocialPlatform; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {icons[platform]}
    </svg>
  );
}
