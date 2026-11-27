import { notFound } from "next/navigation";
import { listOfficials, readOfficial } from "@/lib/admin/content";
import { attempt, PageHead, SetupNotice } from "@/components/admin/Page";
import { OfficialEditor, type OfficialInitial } from "@/components/admin/OfficialEditor";
import { LockGate } from "@/components/admin/LockGate";
import { readLocks } from "@/lib/admin/locks";

export const metadata = { title: "Edit official" };

export default async function EditOfficial({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await attempt(async () => {
    const [official, all, locks] = await Promise.all([readOfficial(id), listOfficials(), readLocks()]);
    return { official, levels: all.levels, locked: locks.includes("officials") };
  });
  if (r.data && !r.data.official) notFound();
  const initial = r.data?.official as OfficialInitial | undefined;
  return (
    <>
      <PageHead kicker="Edit official" title={initial?.name ?? id} />
      {r.error && <SetupNotice>{r.error}</SetupNotice>}
      {r.data && initial && (
        <LockGate locked={r.data.locked} label="Officials">
          <OfficialEditor isNew={false} levels={r.data.levels} initial={initial} />
        </LockGate>
      )}
    </>
  );
}
