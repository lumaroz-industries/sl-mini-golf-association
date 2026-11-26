import { listPlayers, readPlayer } from "@/lib/admin/content";
import { attempt, PageHead, SetupNotice } from "@/components/admin/Page";
import { CardMaker } from "@/components/admin/CardMaker";

export const metadata = { title: "Card Maker" };

export default async function CardMakerPage({ searchParams }: { searchParams: Promise<{ player?: string }> }) {
  const { player } = await searchParams;
  const r = await attempt(async () => {
    const list = await listPlayers();
    // Each player's card design, so the preview shows their own card.
    const cards = await Promise.all(list.map(async (p) => ((await readPlayer(p.slug))?.card as "state" | "national" | "international" | undefined)));
    return list.map((p, i) => ({ slug: p.slug, name: p.name, photo: p.photo, card: cards[i] }));
  });
  return (
    <>
      <PageHead kicker="Players" title="Card Maker" lede="Turn any portrait into a finished player-card photo: background removed, a studio backdrop, framed for the card." />
      {r.error && <SetupNotice>{r.error}</SetupNotice>}
      <CardMaker players={r.data ?? []} initialSlug={player} />
    </>
  );
}
