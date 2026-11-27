import { listPlayers, readSection } from "@/lib/admin/content";
import { readPins } from "@/lib/admin/locks";
import { attempt, PageHead, SetupNotice } from "./Page";
import { SectionEditor } from "./SectionEditor";

const TEXT = {
  international: { title: "International players", where: "below the Top 7" },
  national: { title: "National players", where: "below the International players" },
  state: { title: "State players", where: "below the National players" },
} as const;

/** The admin page for one level section (International, National or State players). */
export async function SectionPage({ section }: { section: "international" | "national" | "state" }) {
  const r = await attempt(async () => {
    const [list, players, pins] = await Promise.all([readSection(section), listPlayers(), readPins()]);
    return { list, players, pins: pins[section] };
  });
  const tx = TEXT[section];
  return (
    <>
      <PageHead kicker="Players" title={tx.title} lede={`Choose who appears in the ${tx.title} section of the Players page (${tx.where}), and in what order. A player can be in more than one section.`} />
      {r.error && <SetupNotice>{r.error}</SetupNotice>}
      {r.data && (
        <SectionEditor
          section={section}
          pins={r.data.pins}
          initial={r.data.list.filter((slug) => r.data!.players.some((p) => p.slug === slug))}
          players={r.data.players.map((p) => ({ slug: p.slug, name: p.name, photo: p.photo, district: p.district, draft: p.draft, topSeven: p.topSeven, card: p.card }))}
        />
      )}
    </>
  );
}
