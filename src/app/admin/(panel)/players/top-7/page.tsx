import { listPlayers, readTopSeven } from "@/lib/admin/content";
import { attempt, PageHead, SetupNotice } from "@/components/admin/Page";
import { TopSevenEditor } from "@/components/admin/TopSevenEditor";
import { readPins } from "@/lib/admin/locks";

export const metadata = { title: "Top 7" };

export default async function TopSevenPage() {
  const r = await attempt(async () => {
    const [lineup, players, pins] = await Promise.all([readTopSeven(), listPlayers(), readPins()]);
    return { lineup, players, pins: pins["top-seven"] };
  });
  return (
    <>
      <PageHead
        kicker="Players"
        title="Maharashtra's Top 7"
        lede="Choose who is in the Top 7 line-up on the Players page. Everyone else is listed in the player directory below it."
      />
      {r.error && <SetupNotice>{r.error}</SetupNotice>}
      {r.data && (
        <TopSevenEditor
          pins={r.data.pins}
          initial={r.data.lineup}
          players={r.data.players.map((p) => ({ slug: p.slug, name: p.name, photo: p.photo, district: p.district, draft: p.draft }))}
        />
      )}
    </>
  );
}
