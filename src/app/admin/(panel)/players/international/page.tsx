import { listPlayers, readInternational } from "@/lib/admin/content";
import { attempt, PageHead, SetupNotice } from "@/components/admin/Page";
import { InternationalEditor } from "@/components/admin/InternationalEditor";
import { LockGate } from "@/components/admin/LockGate";
import { readLocks } from "@/lib/admin/locks";

export const metadata = { title: "International players" };

export default async function InternationalPage() {
  const r = await attempt(async () => {
    const [list, players, locks] = await Promise.all([readInternational(), listPlayers(), readLocks()]);
    return { list, players, locked: locks.includes("international") };
  });
  return (
    <>
      <PageHead
        kicker="Players"
        title="International players"
        lede="Choose who appears in the International players section of the Players page (below the Top 7), and in what order. Top 7 players can be here too."
      />
      {r.error && <SetupNotice>{r.error}</SetupNotice>}
      {r.data && (
        <LockGate locked={r.data.locked} label="International players">
        <InternationalEditor
          initial={r.data.list.filter((slug) => r.data!.players.some((p) => p.slug === slug))}
          players={r.data.players.map((p) => ({ slug: p.slug, name: p.name, photo: p.photo, district: p.district, draft: p.draft, topSeven: p.topSeven, card: p.card }))}
        />
        </LockGate>
      )}
    </>
  );
}
