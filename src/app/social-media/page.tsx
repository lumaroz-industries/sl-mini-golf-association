import type { Metadata } from "next";
import { findNavItem } from "@/config/navigation";
import { ComingSoon } from "@/components/placeholder/ComingSoon";

const item = findNavItem("/social-media");

export const metadata: Metadata = {
  title: item.label,
  description: item.summary,
  robots: { index: false, follow: true },
};

export default function Page() {
  return <ComingSoon item={item} />;
}
