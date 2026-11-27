import { listOfficials } from "@/lib/admin/content";
import { attempt, PageHead, SetupNotice } from "@/components/admin/Page";
import { OfficialsList } from "@/components/admin/OfficialsList";
import { LockGate } from "@/components/admin/LockGate";
import { readLocks } from "@/lib/admin/locks";

export const metadata = { title: "Officials" };

export default async function OfficialsAdmin() {
  const r = await attempt(async () => ({ ...(await listOfficials()), locked: (await readLocks()).includes("officials") }));
  return (
    <>
      <PageHead
        kicker="Officials"
        title="Officials"
        lede="The officials on the Officials page, by level. Add, edit or remove them, change their photos, and set the order they appear in."
        action={{ href: "/admin/officials/new", label: "+ New official" }}
      />
      {r.error && <SetupNotice>{r.error}</SetupNotice>}
      {r.data && (
        <LockGate locked={r.data.locked} label="Officials">
          <OfficialsList levels={r.data.levels} initial={r.data.officials} />
        </LockGate>
      )}
    </>
  );
}
