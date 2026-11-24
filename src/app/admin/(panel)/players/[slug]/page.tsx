import { notFound } from "next/navigation";
import { readPlayer } from "@/lib/admin/content";
import { PlayerEditor, type PlayerInitial } from "@/components/admin/PlayerEditor";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { attempt, PageHead, SetupNotice } from "@/components/admin/Page";
import players from "@/content/sources/local/players.json";

export const metadata = { title: "Edit player" };

export default async function EditPlayer({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await attempt(() => readPlayer(slug));
  if (r.error !== undefined) return <SetupNotice>{r.error}</SetupNotice>;
  if (!r.data) notFound();
  const initial = r.data as PlayerInitial;
  const inTop = (players.featured as Array<{ slug: string }>).some((f) => f.slug === slug);
  return (
    <>
      <PageHead kicker={inTop ? "Edit player · Top 7" : "Edit player"} title={initial.name ?? slug} />
      <PlayerEditor key={slug} isNew={false} initial={{ ...initial, slug, draft: initial.draft === true }} />
      {!inTop && (
        <div style={{ marginTop: 40 }}>
          <DeleteButton collection="players" slug={slug} title={initial.name ?? slug} after="/admin/players" />
        </div>
      )}
    </>
  );
}
