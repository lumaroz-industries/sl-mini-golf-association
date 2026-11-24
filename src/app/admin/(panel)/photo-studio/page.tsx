import { listPlayers } from "@/lib/admin/content";
import { attempt, PageHead, SetupNotice } from "@/components/admin/Page";
import { PhotoStudio } from "@/components/admin/PhotoStudio";

export const metadata = { title: "Photo Studio" };

export default async function PhotoStudioPage({ searchParams }: { searchParams: Promise<{ player?: string }> }) {
  const { player } = await searchParams;
  const r = await attempt(() => listPlayers());
  return (
    <>
      <PageHead
        kicker="Players"
        title="Photo Studio"
        lede="Turn any phone photo into a front-facing studio portrait that fits the player card — free, and the face stays 100% the player's own."
      />
      {r.error && <SetupNotice>{r.error}</SetupNotice>}
      <PhotoStudio players={(r.data ?? []).map((p) => ({ slug: p.slug, name: p.name, gender: p.gender, photo: p.photo }))} initialSlug={player} />
    </>
  );
}
