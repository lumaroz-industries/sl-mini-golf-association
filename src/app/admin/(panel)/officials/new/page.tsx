import { listOfficials } from "@/lib/admin/content";
import { attempt, PageHead, SetupNotice } from "@/components/admin/Page";
import { OfficialEditor } from "@/components/admin/OfficialEditor";

export const metadata = { title: "New official" };

export default async function NewOfficial({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const { level } = await searchParams;
  const r = await attempt(() => listOfficials());
  return (
    <>
      <PageHead kicker="Officials" title="New official" />
      {r.error && <SetupNotice>{r.error}</SetupNotice>}
      {r.data && <OfficialEditor isNew levels={r.data.levels} initial={{ level: level && r.data.levels.some((l) => l.id === level) ? level : undefined }} />}
    </>
  );
}
