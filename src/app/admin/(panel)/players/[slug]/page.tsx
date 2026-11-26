import { notFound } from "next/navigation";
import { readPlayer, readTopSeven } from "@/lib/admin/content";
import { PlayerEditor, type PlayerInitial } from "@/components/admin/PlayerEditor";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { attempt, PageHead, SetupNotice } from "@/components/admin/Page";
import Link from "next/link";
import s from "@/components/admin/admin.module.css";

export const metadata = { title: "Edit player" };

export default async function EditPlayer({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await attempt(() => readPlayer(slug));
  const top = await attempt(() => readTopSeven());
  if (r.error !== undefined) return <SetupNotice>{r.error}</SetupNotice>;
  if (!r.data) notFound();
  const initial = r.data as PlayerInitial;
  const inTop = !!top.data && Object.values(top.data).includes(slug);
  return (
    <>
      <PageHead kicker={inTop ? "Edit player · Top 7" : "Edit player"} title={initial.name ?? slug} />
      <p className={s.help} style={{ margin: "-12px 0 22px" }}>
        {inTop ? "In Maharashtra's Top 7." : "Not in the Top 7 — listed in the player directory."}{" "}
        <Link href="/admin/players/top-7" style={{ color: "var(--gold)", textDecoration: "underline" }}>
          {inTop ? "Change the Top 7" : "Add to the Top 7"}
        </Link>
      </p>
      <PlayerEditor key={slug} isNew={false} initial={{ ...initial, slug, draft: initial.draft === true }} />
      {!inTop && (
        <div style={{ marginTop: 40 }}>
          <DeleteButton collection="players" slug={slug} title={initial.name ?? slug} after="/admin/players" />
        </div>
      )}
    </>
  );
}
